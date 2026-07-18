const axios = require('axios');
async function run() {
  const res = await axios.get('https://zee-dl.shop/embed.php?download=LcqKJeeMF2r5sZ5F9xacUzcCl', {
    maxRedirects: 0,
    validateStatus: function (status) {
      return status >= 200 && status < 400; // default
    }
  });
  console.log(res.headers.location || res.data);
}
run();
