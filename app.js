const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const ContentsMagazine = require('./models/contentsSchema');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const { MONGO_DB_CODE } = require('./config/config.json')

const PORT = process.env.PORT || 3001;
const URL = 'https://magazine-notification-app.herokuapp.com'

// public 폴더 내 소스 사용을 위함 (html, css, 이미지 등)
app.use(express.static('public'))

app.use(cors());

// 프론트엔드 파싱 위함
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

// create server from Heroku
app.listen(PORT, () => console.log(`server is running on port ${PORT}!`));
mongoose.connect(MONGO_DB_CODE, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((result) => console.log('connected to db'))
  .catch((err) => console.log(err));

app.get('/contents', (req, res) => {
  ContentsMagazine.find()
    .sort({ scraped_at: 'desc' })
    .exec((err, docs) => {
      if (err) {
        console.log(err);
      } else {
        res.json(docs);
      }
    })
})

app.get('/', (req, res) => {
  res.sendFile('./index.html', { root: __dirname });
})


/* crawling API */

app.post('/input', (req, res) => {
  crawler()
    .then(resp => {
      resp.forEach(obj => {
        let newContent = new ContentsMagazine({
          title: obj.title,
          scraped_at: obj.scraped_at,
          url: obj.url,
          img_url: obj.img_url,
          description: obj.description
        });

        newContent.save()
          .then(result => {
            console.log('succeed to save: ', result.title);
          })
          .catch(err => {
            res.send(err);
          });

      })
    })
    .then(result => res.send('result of crawling is saved'))
})

app.get('/output', (req, res) => {
  ContentsMagazine.find()
    .sort({ scraped_at: 'desc' })
    .exec((err, docs) => {
      if (err) {
        console.log(err);
      } else {
        res.json(docs);
      }
    })
})

app.get('/clear', (req, res) => {
  ContentsMagazine.remove({}, err => {
    if (err) {
      console.log(err)
    } else {
      res.send('all data is cleared')
    }
  })
});


//----------------------------


const crawler = async () => {

  console.log('------ crawling start ------');

  const response = await fetch(`${URL}/output`);
  let data = await response.json();
  data = data.map(obj => obj = obj.title);

  console.log('------ HERE 01 ------');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      // '--disable-setuid-sandbox',
    ],
  });

  console.log('------ HERE 02 ------');

  const page = await browser.newPage();

  console.log('------ HERE 03 ------');

  await page.goto('https://urclass.codestates.com/');

  console.log('------ HERE 04(start wait) ------');

  await page.waitForSelector('div.cardnews-content > div > div > a:nth-child(5)');

  console.log('------ HERE 05(finished wait) ------');

  const contents = await page.evaluate(() => {
    const contentsList = [];
    for (let i = 1; i <= 5; i++) {
      console.log('(', i, '/5)번째 진행중 ...');
      let obj = {};
      let contentsEle = document.querySelector(`div.cardnews-content > div > div > a:nth-child(${i})`);
      obj['title'] = contentsEle.querySelector('.title').textContent;
      obj['scraped_at'] = Date.now()
      obj['url'] = contentsEle.getAttribute('href');
      obj['img_url'] = getComputedStyle(contentsEle.querySelector('.image-container > div'))
        .getPropertyValue('background-image')
        .replace('url("', '').replace('")', '');
      obj['description'] = contentsEle.querySelector('.description').textContent;
      contentsList.push(obj);
    }
    return contentsList;
  });
  // contentList = contents;
  // console.log(contentList);
  browser.close();

  let result = [];
  contents.forEach(content => {
    if (!data.includes(content.title)) {
      result.push(content)
    }
  })

  console.log('------ crawling end ------');
  return result;
};
