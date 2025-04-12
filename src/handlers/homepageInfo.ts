import { Env } from '../index';
import { getReadBooks, UpdateRead } from './read';
import { j } from 'vitest/dist/index-220c1d70';
import { IRequest } from 'itty-router';

const musicInfoAPI = "https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=rj&format=json&limit=1&period=1month&user=dacubeking"
const OPEN_LIBRARY_CURRENTLY_READING_LIST = "Currently Reading"
const HOMEPAGE_INFO_KEY = "HOMEPAGE_INFO"

export interface MusicAPIRoot {
	toptracks: Toptracks
}

export interface Toptracks {
	track: Track[]
	"@attr": Attr2
}

export interface Track {
	streamable: Streamable
	mbid: string
	name: string
	image: Image[]
	artist: Artist
	url: string
	duration: string
	"@attr": Attr
	playcount: string
}

export interface Streamable {
	fulltrack: string
	"#text": string
}

export interface Image {
	size: string
	"#text": string
}

export interface Artist {
	url: string
	name: string
	mbid: string
}

export interface Attr {
	rank: string
}

export interface Attr2 {
	user: string
	totalPages: string
	page: string
	total: string
	perPage: string
}


async function updateHomepageInfo(env: Env) {
	let url = new URL(musicInfoAPI);
	url.searchParams.set("api_key", env.LAST_FM_API_KEY)
	let favoriteTrackPromise = fetch(url.toString())
		.then(response => response.json() as Promise<MusicAPIRoot>)
		.then(json => {
			return json.toptracks.track[0];
		});
	let readingBooksPromise = getReadBooks(env)
		.then(books =>
			books.filter(b => b.list == OPEN_LIBRARY_CURRENTLY_READING_LIST)
		);

	let [favoriteTrack, readingBooks] = await Promise.allSettled([favoriteTrackPromise, readingBooksPromise]);
	if (favoriteTrack.status !== 'rejected' && readingBooks.status !== 'rejected') {
		let body = JSON.stringify({
			favoriteTrack: favoriteTrack.value,
			readingBooks: readingBooks.value,
		});
		const current = await env.BOOKS.get(HOMEPAGE_INFO_KEY);
		if (current != body) {
			// We have less writes than reads, so we can save some usage by only writing if the data has changed
			await env.BOOKS.put(HOMEPAGE_INFO_KEY, body);
		}
	} else {
		console.log(favoriteTrack, readingBooks);
	}
}

async function getHomepageInfo(request: IRequest, env: Env) {
	let body = await env.BOOKS.get(HOMEPAGE_INFO_KEY);
	if (body === undefined || body === null) {
		await updateHomepageInfo(env);
	}

	const headers = {
		"Access-Control-Allow-Origin": "*",
		'Content-type': 'application/json; charset=UTF-8',
	};

	return new Response(body, { headers });
}

export {getHomepageInfo, updateHomepageInfo}
