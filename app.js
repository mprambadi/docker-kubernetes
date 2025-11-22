const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.json({ 
        message: 'Hello Docker!', 
        container: process.env.HOSTNAME 
    });
});

app.listen(3000, () => console.log('App running on port 3000'));
