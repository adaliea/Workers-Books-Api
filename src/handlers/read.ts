import { IRequest } from 'itty-router';
import { Env } from '..';
import { getBestBook } from './bestedition';

const READ_KEY = "READING_LIST";

const host = "https://openlibrary.org";
const RECENT_READ = host + "/people/dacubeking5259/books/already-read.json";
const CURRENTLY_READING =
  host + "/people/dacubeking5259/books/currently-reading.json";

class BookMetaData {
  name!: string;
  link!: string;
  authors!: string[];
  authorLinks!: string[];
  published!: string;
  coverLink!: string;
  loggedDate!: string;
  workId!: string;
  list!: string;
}

function getCover(id: string) {
  return `https://covers.openlibrary.org/b/id/${id}-L.jpg`;
}

const init = {
  headers: {
    "content-type": "application/json;charset=UTF-8",
  },
};

const UpdateRead = async (env: Env) => {
  // keep getting pages until we get to the end
  let page = 1;
  let books: BookMetaData[] = [];

  console.log("Updating read books");
  for (let [listLink, listName] of [
    [RECENT_READ, "read"],
    [CURRENTLY_READING, "currentlyReading"],
  ]) {
    while (true) {
      let bookJson: {
        reading_log_entries: {
          work: {
            title: string;
            key: string;
            author_keys: string[];
            author_names: string[];
            cover_id: number;
            first_publish_year: string;
          };
          logged_edition: string;
          logged_date: string;
        }[];
      } = await fetch(`${listLink}?page=${page}`).then((res) => res.json());

      if (bookJson.reading_log_entries.length == 0) {
        console.log("No more books");
        break;
      } else {
        console.log(`Got page ${page}`);
      }

      for (let entry of bookJson.reading_log_entries) {
        var key = entry.work.key.split("/").pop();
        await getBestBook(key, env)
          .then((data) => {
            console.log(data);
            return data;
          })
          .then((work) => {
            //console.log('data: ' + JSON.stringify(work));
            books.push({
              name: work.name,
              link: work.link,
              authors: entry.work.author_names,
              authorLinks: entry.work.author_keys.flatMap(
                (key: string) => `https://openlibrary.org${key}`
              ),
              published: entry.work.first_publish_year,
              coverLink: getCover(work.covers[0].toString()),
              loggedDate: entry.logged_date,
              workId: key,
              list: listName,
            });
          })
          .catch((err) => {
            console.error("Error" + err);
          });
      }
    }

    page++;

    if (page > 10) {
      break;
    }
  }

  //Sort the books by the logged date

  books.sort((a, b) => {
    return new Date(b.loggedDate).getTime() - new Date(a.loggedDate).getTime();
  });

  if (books.length < 1) {
    console.log("No books found");
    return;
  }
  console.log("books: " + JSON.stringify(books));

  await env.BOOKS.put(READ_KEY, JSON.stringify(books));
};

const Read = async (request: IRequest, env: Env) => {
	var json = await env.BOOKS.get(READ_KEY);

	if (json === undefined || json === null || json === '') {
		await UpdateRead(env);
		json = await env.BOOKS.get(READ_KEY);
	}

	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Content-type': 'application/json; charset=UTF-8',
	};

	return new Response(json, { headers });
};

export { UpdateRead, Read, getCover };
