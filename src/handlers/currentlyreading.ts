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
}

/**
 * gatherResponse awaits and returns a response body as a string.
 * Use await gatherResponse(..) in an async function to get the response body
 * @param {Response} response
 */
async function gatherResponse(response) {
	const { headers } = response;
	const contentType = headers.get('content-type') || '';
	if (contentType.includes('application/json')) {
		return JSON.stringify(await response.json());
	}
	return response.text();
}

function combineList(list: string[]) {
	var out = '';

	// combine all of the elements into a nicely formatted string with commas and an "&"
	// be sure not to add "&" if there is only one element in the list
	for (var i = 0; i < list.length; i++) {
		if (i == 0) {
			out += list[i];
		} else if (i == list.length - 1) {
			out += ' & ' + list[i];
		} else {
			out += ', ' + list[i];
		}
	}

	return out;
}

const UpdateCurrentlyReading = async (env: Env) => {
	const response = await fetch(currReading, init);

	const json = await response.json();

	let books: Book[] = [];

	json.reading_log_entries.forEach(
		(bookJson: {
			work: { title: any; key: any; author_names: string[]; author_keys: string[] };
		}) => {
			books.push({
				name: bookJson.work.title,
				link: host + bookJson.work.key,
				authors: bookJson.work.author_names,
				authorLinks: bookJson.work.author_keys.map(authorKey => host + authorKey),
			});
		}
	);

	var body: string;

	if (books.length == 0) {
		body = '';
	} else {
		body =
			"I'm currently reading " +
			combineList(
				books.map(
					book =>
						`<a href="${book.link}">${book.name}</a> by ${combineList(
							book.authors.map(
								(author, index) => `<a href="${book.authorLinks[index]}">${author}</a>`
							)
						)}`
				)
			);
	}

	await env.BOOKS.put(CURRNETLY_READING_KEY_ID, body);
};

const CURRNETLY_READING_KEY_ID = 'all-animals';

const CurrentlyReading = async (request, env: Env) => {
	var body = await env.BOOKS.get(CURRNETLY_READING_KEY_ID);

	if (body === undefined || body === null) {
		await UpdateCurrentlyReading(env);
		body = await env.BOOKS.get(CURRNETLY_READING_KEY_ID);
	}

	console.log(body);

	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Content-type': 'text/html',
	};

	return new Response(body, { headers });
};

export { CurrentlyReading, UpdateCurrentlyReading };
