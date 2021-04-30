// See:
//	https://jsforall.com/nodejs/steps-to-create-first-nodejs-express-app/
// 	https://coderrocketfuel.com/article/how-to-serve-static-files-using-node-js-and-express
const express = require('express');
const path = require("path")
const app = express();

app.use("/", express.static(path.join(__dirname, "www")))

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`App listening on port ${PORT}`);
	console.log('Press Ctrl+C to quit.');
});


/*

npm init
npm install express --save

*/