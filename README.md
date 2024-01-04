Utilizes the Openlibrary APIs to serve my books websites

# Endpoints
## Currently Reading
https://books.api.dacubeking.com/currentlyreading

Example Response:
```html
I'm currently reading <a href="https://openlibrary.org/works/OL66554W">Pride and Prejudice</a> by <a href="https://openlibrary.org/authors/OL21594A">Jane Austen</a>
```

## Read
https://books.api.dacubeking.com/read

Example Response:
```json
[
    {
        "name": "Along for the Ride",
        "link": "https://openlibrary.org/books/OL24267579M",
        "authors": [
            "Sarah Dessen"
        ],
        "authorLinks": [
            "https://openlibrary.org/authors/OL22339A"
        ],
        "published": 2009,
        "coverLink": "https://covers.openlibrary.org/b/id/6416538-L.jpg",
        "loggedDate": "2023/10/17, 03:22:41",
        "workId": "OL15024568W",
        "list": "Already Read",
        "percentComplete": 0
    },
    {
        "name": "The Inheritance Games",
        "link": "https://openlibrary.org/books/OL31390786M",
        "authors": [
            "Jennifer Lynn Barnes"
        ],
        "authorLinks": [
            "https://openlibrary.org/authors/OL2678446A"
        ],
        "published": 2020,
        "coverLink": "https://covers.openlibrary.org/b/id/14351078-L.jpg",
        "loggedDate": "2023/08/22, 17:27:15",
        "workId": "OL21692056W",
        "list": "Already Read",
        "pages": 400,
        "percentComplete": 0
    },
    {
        "name": "The Fault in Our Stars",
        "link": "https://openlibrary.org/books/OL28480321M",
        "authors": [
            "John Green"
        ],
        "authorLinks": [
            "https://openlibrary.org/authors/OL5046634A"
        ],
        "published": 2010,
        "coverLink": "https://covers.openlibrary.org/b/id/13010833-L.jpg",
        "loggedDate": "2023/08/13, 06:57:25",
        "workId": "OL16444438W",
        "list": "Already Read",
        "pages": 313,
        "percentComplete": 0
    }
]
```

## Best Edition
https://books.api.dacubeking.com/bestedition?workId=OL21692056W

### Params:
- workId: OpenLibrary ID for the work we're intrested in
- render: (optional) `true`/`false`: Generates an html page showing all valid editions. Allows overriding the best edition if desired.
- bypassCache: (optional) `true`/`false`: Bypass the cache if true

Example Response:
```
{
    "name": "The Inheritance Games",
    "link": "https://openlibrary.org/books/OL31390786M",
    "authors": [
        "/authors/OL2678446A"
    ],
    "authorLinks": [
        "https://openlibrary.org/authors/OL2678446A"
    ],
    "published": "Jul 27, 2021",
    "publishers": [
        "Little Brown & Co"
    ],
    "covers": [
        14351078
    ],
    "physicalFormat": "paperback",
    "pages": 400,
    "isbn": "9780759555402",
    "latestRevision": 4
}
```

## Best Edition Edit (requires valid oauth token)
https://books.api.dacubeking.com/bestedition/edit

### Params:
- workId: OpenLibrary ID for the work we're intrested in
- overrideData: JSON to return when requesting the best edition for this book.
- cover: cover id that we want displayed

Respone:

Redirects to `https://dacubeking.com/readingedit/reading`

## Progress Editing (requires valid oauth token)

### Params
- workId: OpenLibrary ID for the work we're intrested in
- percent: percentage completion for the book
- totalPages: total number of pages in the book

Response:

Redirects to `https://dacubeking.com/readingedit/updateProgress` with the `overrideJson` param returning the current state. (This is due to API for accessing this data only updating every 15 minutes)



