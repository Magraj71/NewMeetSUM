// pages/api/upload-recording.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const form = new formidable.IncomingForm();
  form.uploadDir = path.join(process.cwd(), "/recordings");
  form.keepExtensions = true;
  await fs.promises.mkdir(form.uploadDir, { recursive: true });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(500).send("error");
    }
    // files.file contains path to saved file
    res.status(200).json({ ok: true, fields });
  });
}
