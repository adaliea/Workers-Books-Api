import { IRequest } from 'itty-router';
import { Env } from '..';

const READ_KEY = "haveRead";

const host = 'https://openlibrary.org';
const recentRead = host + '/people/dacubeking5259/books/already-read.json';

class BookMetaData {
	name!: string;
	link!: string;
	authors!: string[];
	authorLinks!: string[];
	published!: string;
	coverLink!: string;
}

function getCover(id: string) {
	return `https://covers.openlibrary.org/b/id/${id}-M.jpg`;
}

const init = {
	headers: {
		'content-type': 'application/json;charset=UTF-8',
	},
};

const UpdateRead = async (env: Env) => {
	// keep getting pages until we get to the end
	let page = 1;
	let books: BookMetaData[] = [];

	while (true) {
		let bookJson = await fetch(`${recentRead}?page=${page}`).then(res => res.json());

		if (bookJson.reading_log_entries.length == 0) {
			break;
		}

		bookJson.reading_log_entries.forEach(
			(entry: {
				work: {
					title: string;
					key: string;
					author_keys: string[];
					author_names: string[];
					cover_id: number;
					first_publish_year: string;
				},
                logged_edition: string;
                logged_date: string
                ;
			}) => {
				books.push({
					name: entry.work.title,
					link: `https://openlibrary.org${entry.logged_edition}`,
					authors: entry.work.author_names,
					authorLinks: entry.work.author_keys.flatMap((key: string) => `https://openlibrary.org${key}`),
					published: entry.work.first_publish_year,
					coverLink: getCover(entry.work.cover_id.toString()),
				});
			}
		);

		page++;

		if (page > 10) {
			break;
		}
	}

	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Content-type': 'application/json; charset=UTF-8',
	};

    await env.BOOKS.put(READ_KEY, JSON.stringify(books));
};

const Read = async (request: IRequest, env: Env) => {
	var json = await env.BOOKS.get(READ_KEY);

	if (json === undefined || json === null) {
		await UpdateRead(env);
		json = await env.BOOKS.get(READ_KEY);
	}

	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Content-type': 'application/json; charset=UTF-8',
	};

	return new Response(json, { headers });
};

export { UpdateRead, Read };
