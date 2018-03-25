[
	{
		type: 'list',
		name: 'target',
		message: 'What would you like to scrape?',
		choices: [
			'Manufacturers',
			'Makes',
			'Models', 
			'Everything'	
		],
		filter: (val) => {
			return val.toLowerCase();
		}
	},
	{
		type: 'list',
		name: 'format',
		message: 'What format of results would you like?',
		choices: [
			'JSON',
			'CSV',
			'XML',
		],
		filter: (val) => {
			return val.toLowerCase();
		}
	},
  {
    type: 'input',
    name: 'destFilePath',
    message: 'Enter the destination file path:',
    default: './results',
    filter: (val) => {
			return val.toLowerCase();
		}
  }
];