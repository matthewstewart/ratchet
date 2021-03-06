const fs = require('fs');
const axios = require('axios');
const inquirer = require('inquirer');
const clear = require('clear');
const colors = require('colors');

initialize();

function initialize() {
	clear();
	printHeader();
	startScrape();
}

function startScrape() {
	scrape()
	.then(statusMessage => {
		console.log(`\n\n${statusMessage}\n\n`.white);
	})
	.catch(error => {
		console.log(error);
		process.exit();
	});
}


async function scrape() {
	try {
		let config = await askConfigQuestions(); // prompt user for config
		//printToConsole(config); // print config to console
		let results = await scrapeTarget(config); // MAIN SCRAPE PROCESS
		saveFile(config.destFilePath, results); // save to destination file path from config
		return "Scrape Complete"; // inform the user that the scrape is complete
	} catch(error) {
		console.log(error); // log error to the console
		process.exit(); // exit the process
	}
}



// Set Configuration
async function askConfigQuestions() {
	try {
		let questions = require('./questions/config.json');
		let answers = await inquirer.prompt(questions);
		return answers;
	} catch(error) {
		console.log(error);
		process.exit();
	}
}

// Scrape Configuration Target
async function scrapeTarget(config) {
	try {
		let result;
		switch(config.target){
			case 'manufacturers':
				result = await getAllMfgs();
				break;
			case 'manufacturers + makes':
				result = await getAllMfgsWithMakes();
				break;
			case 'manufacturers + makes + models':
				result = await getAllMfgsMakesModels();
				break;		
			case 'makes':
				result = await getAllMakes();
				break;
			case 'models':
				console.log('\n1. Scrape Vehicle Models from NHTSA'.bold.white);
				break;
			case 'everything':
				console.log('\n1. Scrape Vehicle Manufacturers from NHTSA'.bold.white);
				console.log('2. Scrape Makes Per Manufacturer from NHTSA'.bold.white);
				console.log('3. Scrape Models Per Make Per Year (1980 to current) from NHTSA'.bold.white);
				break;
		}
		return result;
	} catch(error) {
		console.log(error);
		process.exit();
	}
}

// scrape all manufacturers from NHTSA
async function getAllMfgs() {
	try {
		console.log('\nscraping manufacturers...'.bold.white);
		const response = await axios.get(`https://vpic.nhtsa.dot.gov/api/vehicles/getallmanufacturers?format=json`);
		const scrapedMfgs = response.data.Results;
		let cleanMfgs = [];
		for(let i = 0; i < scrapedMfgs.length; i++){
			let mfgName = scrapedMfgs[i].Mfr_CommonName || scrapedMfgs[i].Mfr_Name;
			let cleanMfgName = mfgName.toLowerCase();
			if(cleanMfgs.indexOf(cleanMfgName) === -1){
				cleanMfgs.push(cleanMfgName);
			}	
		}
		cleanMfgs.sort();
		console.log(`complete - ${cleanMfgs.length} manufacturers scraped`.bold.white);
		return cleanMfgs;
	} catch(error) {
		console.log(error);
		process.exit();		
	}
}

// scrape all manufacturers with makes from NHTSA
async function getAllMfgsWithMakes() {
	try {
		let mfgs = await getAllMfgs();
		console.log('\nadding makes to each manufacturer...'.bold.white);
		let makeCounter = 0;
		let populatedMfgs = [];
		for(let i = 0; i < mfgs.length; i++){
			console.log(`adding makes to ${mfgs[i]}...`);
			let mfg = mfgs[i];
			const response = await axios.get(`https://vpic.nhtsa.dot.gov/api/vehicles/getmakeformanufacturer/${mfg}?format=json`);
			const scrapedMakes = response.data.Results;
			let mfgObj = {
				name: mfg,
				makes: []
			};
			if(scrapedMakes){
				let cleanMakes = [];
				for(let j = 0; j < scrapedMakes.length; j++){
					let makeName = scrapedMakes[j].Make_Name.toLowerCase();
					if(cleanMakes.indexOf(makeName) == -1){ cleanMakes.push(makeName); makeCounter++; }
				}
				cleanMakes.sort();
				for(let k = 0; k < cleanMakes.length; k++){
					mfgObj.makes.push(cleanMakes[k]);
				}
			}	
			populatedMfgs.push(mfgObj);
		}
		console.log(`complete - ${makeCounter} makes added`.bold.white);
		return populatedMfgs;
	} catch(error) {
		console.log(error);
		process.exit();		
	}
}


async function getAllMfgsMakesModels() {
	try {
		let mfgs = await getAllMfgsWithMakes();
		let populatedMfgs = [];
		for(let i = 0; i < mfgs.length; i++){
			let mfg = mfgs[i];
			let mfgObj = {
				name: mfg.name,
				makes: []
			};
			for(let j = 0; j < mfg.makes.length; j++){
				let makeObj = {
					name: mfg.makes[j],
					models: []
				};
				console.log(`adding models to ${mfg.name}`);
				const response = await axios.get(`https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${makeObj.name}?format=json`);
				const scrapedModels = response.data.Results;
				
				if(scrapedModels){
					for(let k = 0; k < scrapedModels.length; k++){
						let modelName = scrapedModels[k].Model_Name.toLowerCase();
						if(makeObj.models.indexOf(modelName) === -1){
							makeObj.models.push(modelName);
						}
					}
				}
				mfgObj.makes.push(makeObj);
			}
			populatedMfgs.push(mfgObj);
		}
		return populatedMfgs;
	} catch(error) {
		console.log(error);
		process.exit();			
	}
}

// scrape all makes from NHTSA
async function getAllMakes() {
	try {
		console.log('\nscraping makes...'.bold.white);
		const response = await axios.get(`https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json`);
		const scrapedMakes = response.data.Results;
		let cleanMakes = [];
		for(let i = 0; i < scrapedMakes.length; i++){
			let make = scrapedMakes[i];
			let name = make.Make_Name.toLowerCase();
			if(cleanMakes.indexOf(name) === -1){
				cleanMakes.push(name);
			}
		}		
		console.log(`complete - ${cleanMakes.length} makes scraped`.bold.white);
		return cleanMakes;
	} catch(error) {
		console.log(error);
		process.exit();		
	}
}


// Helpers 

// human readable JSON Stringify printed to console
function printToConsole(val) {
	console.log('\n' + JSON.stringify(val, null, '  ').blue + '\n');
}

// the header
function printHeader() {
	console.log('\n-----------------------------------------------------'.bold.grey);
	console.log('\n-- -- -- '.bold.yellow + 'Ratchet - Vehicle Info Web Scraper'.bold + ' -- -- --'.bold.yellow);
	console.log('\n-----------------------------------------------------\n\n'.bold.grey);
}

// save file in human readable JSON
function saveFile(destFilePath, content) {
	fs.writeFileSync(destFilePath, JSON.stringify(content, null, '  '));
}