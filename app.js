// app.js - Main Node.js application file

const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const { readSheet, getAllUniqueData, prepareChartData } = require('./sheets');
const { configDotenv } = require('dotenv');
configDotenv();

const app = express();
const port = 5171;
const hbs = exphbs.engine({
  defaultLayout: 'main',
  helpers: {
    eq: function (a, b) {
      return a === b;
    },json: function (context) {
      return JSON.stringify(context);
    }
  }
});
// Set up Handlebars as the view engine
app.engine('handlebars', hbs);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Mock data similar to the screenshot

// Route for the dashboard
app.get('/dashboard', async (req, res) => {
  try {
    const { college = "All", university = "All", district = "All" } = req.query;

    const uniqueData = await getAllUniqueData();
    let chartData = await prepareChartData();

    // === Apply filters ===
    if (college !== "All") {
      // Normal bar: departments for this college
      chartData = await prepareChartData({ college });
    } else if (university !== "All") {
      chartData = await prepareChartData({ university });
    } else if (district !== "All") {
      chartData = await prepareChartData({ district });
    }

    res.render("dashboard", {
      collegeNames: ["All", ...uniqueData.collegeNames],
      universityNames: ["All", ...uniqueData.university],
      districts: ["All", ...uniqueData.district],
      departments: uniqueData.departments,
      selectedCollege: college,
      selectedUniversity: university,
      selectedDistrict: district,
      chartData,
    });
  } catch (error) {
    console.error("Error rendering dashboard:", error);
    res.status(500).send("Internal Server Error");
  }
});


// Default route
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

app.listen(port, () => {
    try{
  console.log(`App listening at http://localhost:${port}`);
}catch(error){
    console.error("Error starting server:", error);
}
});