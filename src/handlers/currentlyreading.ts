import { IRequest } from 'itty-router';
import { Env } from '..';
import { Read, getReadBooks } from './read';

const CURRENTLY_READING_KEY_ID = "currentlyReading";
const OPEN_LIBRARY_CURRENTLY_READING_LIST = "Currently Reading"

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
  let data = await getReadBooks(env);

  let books = data.filter(b => b.list == OPEN_LIBRARY_CURRENTLY_READING_LIST)

	let body: string;

	if (books.length == 0) {
    body = "";
  } else {
    const bookPromises = books.map(async (book) => {
			const percentComplete = book.percentComplete;

			return `<a href="${book.link}">${book.name}</a> by ${combineList(
        book.authors
      )} <span class="reading-percentage">(${Math.round(
        percentComplete * 100
      )}% done!)</span>`;
    });

    const bookHtml = await Promise.all(bookPromises);

    body = "Currently, I'm reading " + combineList(bookHtml);
  }

	const current = await env.BOOKS.get(CURRENTLY_READING_KEY_ID);
	if (current != body) {
    // We have less writes than reads, so we can save some usage by only writing if the data has changed
    await env.BOOKS.put(CURRENTLY_READING_KEY_ID, body);
  }
};

const CurrentlyReading = async (request: IRequest, env: Env) => {
	let body = await env.BOOKS.get(CURRENTLY_READING_KEY_ID);

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
