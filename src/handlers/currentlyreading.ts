import { IRequest } from 'itty-router';
import { Env } from '..';

const init = {
	headers: {
		'content-type': 'application/json;charset=UTF-8',
	},
};

const host = 'https://openlibrary.org';
const currReading = host + '/people/dacubeking5259/books/currently-reading.json';
const recentRead = host + '/people/dacubeking5259/books/already-read.json';

class Book {
  name!: string;
  link!: string;
  authors!: string[];
  authorLinks!: string[];
  workId!: string;
}

/**
 * gatherResponse awaits and returns a response body as a string.
 * Use await gatherResponse(..) in an async function to get the response body
 * @param {Response} response
 */
async function gatherResponse(response: {
  json?: any;
  text?: any;
  headers?: any;
}) {
  const { headers } = response;
  const contentType = headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return JSON.stringify(await response.json());
  }
  return response.text();
}

function combineList(list: string[]) {
  var out = "";

  // combine all of the elements into a nicely formatted string with commas and an "&"
  // be sure not to add "&" if there is only one element in the list
  for (var i = 0; i < list.length; i++) {
    if (i == 0) {
      out += list[i];
    } else if (i == list.length - 1) {
      out += " & " + list[i];
    } else {
      out += ", " + list[i];
    }
  }

  return out;
}

const UpdateCurrentlyReading = async (env: Env) => {
  const response = await fetch(currReading, init);

  const json: {
    reading_log_entries: {
      work: {
        title: any;
        key: any;
        author_names: string[];
        author_keys: string[];
      };
    }[];
  } = await response.json();

  let books: Book[] = [];

  json.reading_log_entries.forEach(
    (bookJson: {
      work: {
        title: any;
        key: any;
        author_names: string[];
        author_keys: string[];
      };
    }) => {
      books.push({
        name: bookJson.work.title,
        link: host + bookJson.work.key,
        authors: bookJson.work.author_names,
        authorLinks: bookJson.work.author_keys.map(
          (authorKey) => host + authorKey
        ),
        workId: bookJson.work.key.split("/").pop(),
      });
    }
  );

  var body: string;

  if (books.length == 0) {
    body = "";
  } else {
    const bookPromises = books.map(async (book) => {
      var percentComplete = 0;

      // get the percent complete
      var data = await env.BOOKS.get(book.workId + "progress");
      if (data != null) {
        var json = JSON.parse(data);
        percentComplete = json.percent;
      }

      return `<a href="${book.link}">${book.name}</a> by ${combineList(
        book.authors.map(
          (author, index) =>
            `<a href="${book.authorLinks[index]}">${author}</a>`
        )
      )} <span class="reading-percentage">(${Math.round(
        percentComplete * 100
      )}%)</span>`;
    });

    const bookHtml = await Promise.all(bookPromises);

    body = "I'm currently reading " + combineList(bookHtml);
  }

  var current = await env.BOOKS.get(CURRENTLY_READING_KEY_ID);
  if (current != body) {
    // We have less writes than reads, so we can save some usage by only writing if the data has changed
    await env.BOOKS.put(CURRENTLY_READING_KEY_ID, body);
  }
};

const CURRENTLY_READING_KEY_ID = "currentlyReading";

const CurrentlyReading = async (request: IRequest, env: Env) => {
  var body = await env.BOOKS.get(CURRENTLY_READING_KEY_ID);

  if (body === undefined || body === null) {
    await UpdateCurrentlyReading(env);
    body = await env.BOOKS.get(CURRENTLY_READING_KEY_ID);
  }

  console.log(body);

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-type": "text/html",
  };

  return new Response(body, { headers });
};

export { CurrentlyReading, UpdateCurrentlyReading };
