const port = 9000;

const express = require('express');
const app = express();

app.use(express.static('.'));

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
