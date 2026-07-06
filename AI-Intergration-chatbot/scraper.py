import os
import time
import requests
import urllib3

from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from playwright.sync_api import sync_playwright

urllib3.disable_warnings()

HEADERS = {
    "User-Agent":
        "Mozilla/5.0 "
        "(Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 "
        "(KHTML, like Gecko) "
        "Chrome/137.0 Safari/537.36"
}

CRAWL_DELAY = 2
MAX_PAGES = 500

os.makedirs(
    "data",
    exist_ok=True
)

session = requests.Session()

retry = Retry(
    total=5,
    connect=5,
    read=5,
    backoff_factor=2,
    status_forcelist=[
        429,
        500,
        502,
        503,
        504
    ]
)

adapter = HTTPAdapter(
    max_retries=retry
)

session.mount(
    "http://",
    adapter
)

session.mount(
    "https://",
    adapter
)


def clean_text(soup):

    for tag in soup(
        [
            "script",
            "style",
            "noscript",
            "svg",
            "img",
            "video",
            "iframe",
            "form",
            "button"
        ]
    ):
        tag.decompose()

    text = soup.get_text(
        separator="\n",
        strip=True
    )

    lines = []

    for line in text.splitlines():

        line = line.strip()

        if len(line) < 3:
            continue

        lines.append(line)

    return "\n".join(lines)


def get_html(url):

    try:

        response = session.get(
            url,
            headers=HEADERS,
            timeout=60,
            verify=False
        )

        html = response.text

        soup = BeautifulSoup(
            html,
            "lxml"
        )

        text = clean_text(
            soup
        )

        if len(text) > 500:
            return html

    except:
        pass

    print(
        f"Using Playwright: {url}"
    )

    try:

        with sync_playwright() as p:

            browser = p.chromium.launch(
                headless=True
            )

            page = browser.new_page()

            page.goto(
                url,
                wait_until="networkidle",
                timeout=60000
            )

            page.wait_for_timeout(
                3000
            )

            html = page.content()

            browser.close()

            return html

    except Exception as e:

        print(
            f"Playwright failed: {url}"
        )
        print(e)

        return None


def crawl_site(start_url):

    parsed = urlparse(
        start_url
    )

    domain = (
        parsed.netloc
        .replace(".", "_")
    )

    output = (
        f"data/{domain}.md"
    )

    visited = set()
    queue = [start_url]

    pages = 0

    with open(
        output,
        "w",
        encoding="utf-8"
    ) as f:

        while queue:

            if pages >= MAX_PAGES:
                break

            url = queue.pop(0)

            if url in visited:
                continue

            visited.add(url)

            print(
                f"[{pages+1}] {url}"
            )

            html = get_html(
                url
            )

            if not html:
                continue

            soup = BeautifulSoup(
                html,
                "lxml"
            )

            title = (
                soup.title.string
                if soup.title
                else ""
            )

            text = clean_text(
                soup
            )

            if len(text) < 200:
                continue

            f.write(
                "\n"
                + "=" * 100
                + "\n"
            )

            f.write(
                f"URL: {url}\n"
            )

            f.write(
                f"TITLE: {title}\n\n"
            )

            f.write(text)
            f.write("\n")

            pages += 1

            for link in soup.find_all(
                "a",
                href=True
            ):

                next_url = urljoin(
                    url,
                    link["href"]
                )

                next_url = (
                    next_url
                    .split("#")[0]
                    .rstrip("/")
                )

                if (
                    urlparse(
                        next_url
                    ).netloc
                    != parsed.netloc
                ):
                    continue

                if (
                    next_url
                    not in visited
                    and next_url
                    not in queue
                ):
                    queue.append(
                        next_url
                    )

            time.sleep(
                CRAWL_DELAY
            )

    print(
        f"\nSaved: {output}"
    )

    print(
        f"Pages: {pages}"
    )


if __name__ == "__main__":

    websites = [
        "https://logisofttechinc.com",
        "https://go.chefgaa.com",
        "https://ntrustly.com",
        "https://eventbookingplus.com"
    ]

    for site in websites:

        print(
            f"\nCrawling {site}"
        )

        crawl_site(
            site
        )