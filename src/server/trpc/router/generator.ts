import { Configuration, OpenAIApi } from "openai";
// import puppeteer, { type Browser } from "puppeteer";
import { z } from "zod";
import chromium from "chrome-aws-lambda";
import playwright from "playwright-core";

import { router, publicProcedure } from "../trpc";

type VideoData = {
  title: string | null | undefined;
};

const configuration = new Configuration({
  apiKey: process.env.OPENAPI_KEY || "",
});

const openai = new OpenAIApi(configuration);

export const generateRouter = router({
  youtube: publicProcedure
    .input(
      z.object({
        topic: z.string().min(1),
        alias: z.string().min(1),
      })
    )
    .mutation(async ({ input }): Promise<string | undefined> => {
      const { topic, alias } = input;
      //  Open Browser
      //  Navigate to Youtube Channel
      //  Accept Cookies
      //  Get All Titles with querySelectorAll
      //  Push All Titles into Array

      const videoData: VideoData[] = await getTitlesFromYoutube(alias);

      //  Close Puppeteer Browser

      const titles = videoData.slice(0, 20);

      const prompt = `The following is a list of youtube titles. After reading the titles, you are given a topic to then write a similiar title for youtube videos.\n\nTITLES: ${titles
        .map((t) => t.title)
        .join("\n")} \n\n SIMILAR TITLE FOR TOPIC ${topic.toUpperCase()}`;

      const res = await openai.createCompletion({
        model: "text-davinci-003",
        prompt,
        temperature: 1,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      console.log(res.data.choices[0]?.text);

      return res.data.choices[0]?.text;
    }),
});

const URL = "https://www.youtube.com";

const getTitlesFromYoutube = async (alias: string): Promise<VideoData[]> => {
  const browser = await playwright.chromium.launch({
    args: [...chromium.args, "--font-render-hinting=none"], // This way fix rendering issues with specific fonts
    executablePath:
      process.env.NODE_ENV === "production"
        ? await chromium.executablePath
        : "/usr/local/bin/chromium",
    headless: process.env.NODE_ENV === "production" ? chromium.headless : true,
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${URL}/${alias}/videos`, {
    waitUntil: "load",
  });

  const videoData = await page.evaluate(() => {
    const videoId = Array.from(
      document.querySelectorAll(
        "yt-formatted-string#video-title.style-scope.ytd-rich-grid-media"
      )
    );
    const data = videoId.map((video: any) => ({
      title: video.innerText,
    }));
    return data;
  });

  await browser.close();

  return videoData;
};
