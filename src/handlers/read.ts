import { IRequest } from 'itty-router';
import { Env } from '..';
import { getBestBook } from './bestedition';

const maxResults = 10000;

const READ_KEY = "READING_LIST";

const host = "https://openlibrary.org";
const ALREADY_READ = host + "/people/dacubeking5259/books/already-read.json";
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
  pages!: number | undefined;
  percentComplete: number = 0;
}

function getCover(id: string) {
  return `https://covers.openlibrary.org/b/id/${id}-L.jpg`;
}

const init = {
  headers: {
    "content-type": "application/json;charset=UTF-8",
  },
};

const ALREADY_READ_KEY = "Already Read";
const CURRENTLY_READING_KEY = "Currently Reading";

const UpdateRead = async (env: Env) => {
  // keep getting pages until we get to the end
  let books: BookMetaData[] = [];

  console.log("Updating read books");
  for (let [listLink, listName] of [
    [ALREADY_READ, ALREADY_READ_KEY],
    [CURRENTLY_READING, CURRENTLY_READING_KEY],
  ]) {
    let page = 1;
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
      } = await fetch(`${listLink}?page=${page}&limit=${maxResults}`).then(
        (res) => res.json()
      );

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
            //console.log(data);
            return data;
          })
          .then(async (work) => {
            var percentComplete = 0;
            var pages = work.pages;
            if (listName == CURRENTLY_READING_KEY) {
              // get the percent complete
              var progressKey = key + "progress";
              var data = await env.BOOKS.get(progressKey);

              if (data != null) {
                var json = JSON.parse(data);
                percentComplete = json.percent;
                pages = json.totalPages;
              }
            }

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
              pages: pages,
              percentComplete: percentComplete,
            });
          })
          .catch((err) => {
            console.error("Error" + err);
          });
      }
      page++;
    }

    if (page > 10) {
      break;
    }
  }

  //Sort the books by the logged date

  const sortByLoggedDate = (a: BookMetaData, b: BookMetaData) => {
    if (a.loggedDate === undefined || b.loggedDate === undefined) {
      return 0;
    }
    // Put the currently reading books at the top
    if (a.list === CURRENTLY_READING_KEY && b.list !== CURRENTLY_READING_KEY) {
      return -1;
    }
    if (a.list !== CURRENTLY_READING_KEY && b.list === CURRENTLY_READING_KEY) {
      return 1;
    }
    return new Date(b.loggedDate).getTime() - new Date(a.loggedDate).getTime();
  };

  //Sort the books by the logged date
  books.sort(sortByLoggedDate);

  if (books.length < 1) {
    console.log("No books found");
    return;
  }
  //console.log("books: " + JSON.stringify(books));

  await env.BOOKS.put(READ_KEY, JSON.stringify(books));

  if (books.length < 1) {
    console.log("No books found");
    return;
  }
  //console.log("books: " + JSON.stringify(books));

  var json = JSON.stringify(books);
  var current = await env.BOOKS.get(READ_KEY);

  if (json != current) {
    // We have less writes than reads, so we can save some usage by only writing if the data has changed
    await env.BOOKS.put(READ_KEY, json);
  }
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
