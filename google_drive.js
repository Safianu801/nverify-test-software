const { google } = require("googleapis");
const stream = require("stream");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground",
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: "v3", auth: oauth2Client });

const uploadFileToDrive = async (fileObject) => {
  try {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileObject.buffer);

    const { data } = await drive.files.create({
      media: {
        mimeType: fileObject.mimetype,
        body: bufferStream,
      },
      requestBody: {
        name: fileObject.originalname,
        parents: [process.env.GOOGLE_FOLDER_ID],
      },
      fields: "id, name, webViewLink, webContentLink",
    });

    await drive.permissions.create({
      fileId: data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    return data;
  } catch (error) {
    console.error("Google Drive Upload Error:", error.message);
    throw error;
  }
};

module.exports = { uploadFileToDrive };
