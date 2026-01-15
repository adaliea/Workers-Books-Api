import { IRequest } from 'itty-router';
import { Env } from '..';

const READ_KEY = "READING_LIST";
const ALREADY_READ_KEY = "Already Read";
const CURRENTLY_READING_KEY = "Currently Reading";

// Hardcover Status IDs
const STATUS_CURRENTLY_READING = 2;
const STATUS_READ = 3;

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

interface HardcoverResponse {
  data: {
    me: [
      {
        user_books: HardcoverUserBook[]
      }
    ]
  }
}

interface HardcoverUserBook {
  status_id: number;
  date_added: string;
  last_read_date: string;
  user_book_reads: {
    progress: number;
  }[];
  book: {
    title: string;
    slug: string;
    contributions: {
      author: {
        name: string;
        slug: string;
      }
    }[];
    image: {
      url: string;
    };
    release_date: string;
    pages: number;
    id: number;
  }
}

const UpdateRead = async (env: Env) => {
  console.log("Updating read books from Hardcover");

  const query = `
    query GetMyBooks {
      me {
        user_books(where: {status_id: {_in: [${STATUS_CURRENTLY_READING}, ${STATUS_READ}]}}) {
          status_id
          date_added
          last_read_date
          user_book_reads {
            progress
          }
          book {
            title
            slug
            pages
            contributions {
              author {
                name
                slug
              }
            }
            image {
              url
            }
            release_date
            id
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://api.hardcover.app/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': env.HARDCOVER_API_TOKEN
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      console.error("Failed to fetch from Hardcover", await response.text());
      return;
    }

    const json = await response.json() as HardcoverResponse;

    // @ts-ignore
    if (!json.data || !json.data.me || json.data.me.length === 0) {
        console.error("No user data found in Hardcover response");
        return;
    }

    // Safe access
    const me = Array.isArray(json.data.me) ? json.data.me[0] : json.data.me as any;
    const userBooks = me.user_books as HardcoverUserBook[];

    let books: BookMetaData[] = userBooks.map(ub => {
      let book = new BookMetaData();
      book.name = ub.book.title;
      book.link = `https://hardcover.app/books/${ub.book.slug}`;

      book.authors = ub.book.contributions.map(c => c.author.name);
      book.authorLinks = ub.book.contributions.map(c => `https://hardcover.app/authors/${c.author.slug}`);

      book.published = ub.book.release_date;
      book.coverLink = ub.book.image ? ub.book.image.url : "https://dummyimage.com/600x900/fff/000&text=No+Cover";
      book.loggedDate = ub.last_read_date || ub.date_added;
      book.workId = ub.book.id.toString();
      book.pages = ub.book.pages;

      if (ub.status_id === STATUS_CURRENTLY_READING) {
        book.list = CURRENTLY_READING_KEY;
        if (book.pages && book.pages > 0) {
            // Get the max progress from all reads (assuming simplified logic)
					book.percentComplete = ub.user_book_reads.reduce((max, read) => Math.max(max, read.progress), 0) / 100.0;
        } else {
            book.percentComplete = 0;
        }
      } else {
        book.list = ALREADY_READ_KEY;
        book.percentComplete = 1;
      }

      return book;
    });

    const sortByLoggedDate = (a: BookMetaData, b: BookMetaData) => {
      if (a.loggedDate === undefined || b.loggedDate === undefined) {
        return 0;
      }
      if (a.list === CURRENTLY_READING_KEY && b.list !== CURRENTLY_READING_KEY) {
        return -1;
      }
      if (a.list !== CURRENTLY_READING_KEY && b.list === CURRENTLY_READING_KEY) {
        return 1;
      }
      return new Date(b.loggedDate).getTime() - new Date(a.loggedDate).getTime();
    };

    books.sort(sortByLoggedDate);

    if (books.length < 1) {
      console.log("No books found");
      return;
    }

    const cachedJson = JSON.stringify(books);
    const current = await env.BOOKS.get(READ_KEY);

    if (cachedJson != current) {
      await env.BOOKS.put(READ_KEY, cachedJson);
    }

  } catch (e) {
    console.error("Error updating read books:", e);
  }
};

const Read = async (request: IRequest, env: Env) => {
  let json;
	let shouldBypassCache = request.query["bypassCache"] === "true";
  if (!shouldBypassCache) {
		json = await env.BOOKS.get(READ_KEY);
	}

  if (shouldBypassCache || json === undefined || json === null || json === '') {
    await UpdateRead(env);
		json = await env.BOOKS.get(READ_KEY);
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-type': 'application/json; charset=UTF-8',
  };

  return new Response(json, { headers });
};

const getReadBooks = async (env: Env, bypassCache = false): Promise<BookMetaData[]> => {
  let json;
	if (!bypassCache) {
		json = await env.BOOKS.get(READ_KEY);
	}

  if (bypassCache || json === undefined || json === null || json === '') {
    await UpdateRead(env);
    json = await env.BOOKS.get(READ_KEY);
  }

  if (json == null) {
    return [] as BookMetaData[]
  }

  return JSON.parse(json)
}

export { UpdateRead, Read, getReadBooks };
