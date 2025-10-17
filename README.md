# Workers Books API

Utilizes the Open Library, Google Books and Last.fm APIs to serve my books and music taste to my websites.

# Endpoints

## `/read`

Returns a JSON array of books that I have read or am currently reading.

**Query Parameters:**

*   `bypassCache` (optional, boolean): If `true`, the cache will be bypassed and the data will be fetched directly from the source.

**Example Response:**
```json
[
    {
        "name": "Along for the Ride",
        "link": "https://books.google.com/books?id=...&printsec=0",
        "authors": [
            "Sarah Dessen"
        ],
        "authorLinks": [
            "https://www.google.com/search?q=Sarah Dessen"
        ],
        "published": "2009",
        "coverLink": "https://covers.openlibrary.org/b/id/6416538-L.jpg",
        "loggedDate": "2023/10/17, 03:22:41",
        "workId": "OL15024568W",
        "list": "Already Read",
        "pages": 384,
        "percentComplete": 1
    }
]
```

## `/homepageinfo`

Returns a JSON object containing information about my favorite music track and the books I'm currently reading.

**Example Response:**
```json
{
    "favoriteTrack": {
        "streamable": {
            "fulltrack": "0",
            "#text": "0"
        },
        "mbid": "...",
        "name": "Song Title",
        "image": [
            {
                "size": "small",
                "#text": "https://lastfm.freetls.fastly.net/i/u/34s/..."
            }
        ],
        "artist": {
            "url": "https://www.last.fm/music/Artist+Name",
            "name": "Artist Name",
            "mbid": "..."
        },
        "url": "https://www.last.fm/music/Artist+Name/_/Song+Title",
        "duration": "225",
        "@attr": {
            "rank": "1"
        },
        "playcount": "50"
    },
    "readingBooks": [
        {
            "name": "Book Title",
            "link": "https://books.google.com/books?id=...&printsec=0",
            "authors": [
                "Author Name"
            ],
            "authorLinks": [
                "https://www.google.com/search?q=Author Name"
            ],
            "published": "2021",
            "coverLink": "https://covers.openlibrary.org/b/id/....jpg",
            "workId": "...",
            "list": "Currently Reading",
            "pages": 400,
            "percentComplete": 0.5
        }
    ]
}
```

## `/updateProgress`

Updates the reading progress of a book.

**Query Parameters:**

*   `workId` (required, string): The ID of the work to update.
*   `percent` (required, number): The percentage of the book that has been read.
*   `totalPages` (required, number): The total number of pages in the book.

**Response:**

Redirects to `https://dacubeking.com/readingedit/updateProgress`.

# Scheduled Tasks

The following tasks are scheduled to run periodically:

*   **`UpdateRead`**: Updates the list of read books from Google Books.
*   **`updateHomepageInfo`**: Updates the homepage info by fetching the latest data from the Last.fm and Google Books APIs.

# Development

To run the project locally, you will need to have [Wrangler](https://developers.cloudflare.com/workers/wrangler/) installed.

1.  Clone the repository:
    ```bash
    git clone https://github.com/dacubeking/Workers-Books-Api.git
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Create a `wrangler.toml` file and a `.dev.vars` file with the required environment variables.
4.  Run the development server:
    ```bash
    npm run dev
    ```

# Deployment

To deploy the project, you will need to have a [Cloudflare account](https://www.cloudflare.com/) and have [Wrangler](https://developers.cloudflare.com/workers/wrangler/) configured.

1.  Build and publish the worker:
    ```bash
    npm run deploy
    ```
