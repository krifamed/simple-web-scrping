process.binding(
    "http_parser"
).HTTPParser = require("http-parser-js").HTTPParser;
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const fs = require("fs");

const results = [];
const baseURL = "www.decathlon.tn";
const URL = "https://www.decathlon.tn/";
let urls = [URL];

// Max request call
const MAX_ITERATION = 200;
let iter = 0;
let visitedURL = {};

async function crawl() {
    iter ++;
    // no more urls or we hit the MAX_ITERATION so save the result in the json file

    console.log(`>>>>>>> pages to visit : ${urls.length} , results we get : ${results.length}`);
    
    if (urls.length === 0 || iter === MAX_ITERATION) {
        fs.writeFile("data.json", JSON.stringify(results), (err) => {
            if (err) {
                console.log(">>>>> err:", err);
            }
        });
        return;
    }
    // get the top url
    let currentUrl = urls.shift();
    // call the scrape function with the top url
    await scrape(currentUrl);
    // recursivly iterate over every link and repeat the process
    crawl();
}

function getLinks($, data) {
    // specificLinks are the links that we want to scrap and get data from , so no need to push them
    let specificLinks = [];
    let _ = data
        .find(".name-product > a")
        .each((_, el) => {
            specificLinks.push($(el).attr("href"))
        });

    // get all the links from a page
    const links = $("a[href]");
    
    links.each((_idx, el) => {
        // get the href attribute for every link
        let link = $(el).attr("href") || "";
        // if the link is a relative link, add the URL as prefix
        if (link.includes(baseURL) === false) {
            link = URL + link;
        }

        //if the link is missing 'https:' as a prefix, add it
        if (link.includes("http") === false) {
            link = "https:" + link;
        }
        // push only the unique link
        if(specificLinks.includes(link)===false && urls.includes(link) === false){
            urls.push(link);
        }
    });
}

async function scrape(url) {
    // if this url is not visited
    if (visitedURL.hasOwnProperty(url) === false) {
        try {
            // make the request to get the html
            const req = await fetch(url);
            const res = await req.text();
            // setup the cheerio with content returned by fetch
            const $ = cheerio.load(res);
            // get all the links to scrap in this pages
            let data = $(".block__thumbnail");

            // get all the links pages
            await getLinks($, data);
            // process the data 
            /**
             * @entry: name
             * @entry: discount
             * @entry: thumbnail
             * @entry: price
             */
            data.each((_idx, el) => {
                let entry = {};
                entry.name = $(el).find(".name-product > a").text();
                entry.discount =
                    $(el).find(".discount-percentage").text().trim() || "0%";
                entry.thumbnail = $(el)
                    .find(".thumbnail > img")
                    .attr("data-src");
                entry.price = $(el).find(".price").text();
                results.push(entry);
            });
            // console.log(results);
            // fs.writeFile("data.json", JSON.stringify(results), (err) => {
            //     if (err) {
            //         console.log(">>>>> err:", err);
            //     }
            // });
        } catch (err) {
            console.log(err);
        }
        visitedURL[url] = true;
    }
}

crawl();

