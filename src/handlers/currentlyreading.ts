import { IRequest } from 'itty-router';
import { Env } from '..';
import { getReadBooks } from './read';

const CURRENTLY_READING_KEY_ID = "currentlyReading";
const OPEN_LIBRARY_CURRENTLY_READING_LIST = "Currently Reading"

const init = {
	headers: {
		'content-type': 'application/json;charset=UTF-8',
	},
};
function combineList(list: string[]) {
	let out = '';

	// combine all of the elements into a nicely formatted string with commas and an "&"
  // be sure not to add "&" if there is only one element in the list
  for (let i = 0; i < list.length; i++) {
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
