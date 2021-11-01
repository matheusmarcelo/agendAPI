const mongoose = require('mongoose');
require('dotenv').config();
const URI = process.env.MONGO_URL;

// mongoose.set('useNewUrlParser', true);
// mongoose.set('useFindAndModify', false);
// mongoose.set('useCreateIndex', true);
// mongoose.set('useUnifiedTopology', true);

mongoose
    .connect(URI)
    .then(() => console.log('DB is up'))
    .catch((err) => console.log(err));