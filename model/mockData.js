var snippetParts = [
	{
		title: 'PHP',
		content: "<?php echo 'hello'; ?>",
		language: 'PHP'
	},
	{
		title: 'JS',
		content: "console.log('hello !');",
		language: 'JS'
	},
	{
		title: 'HTML/CSS',
		content: "<h1>Foo bar</h1>",
		language: 'HTML'
	}
];

var languages = [
	{ name : 'PHP'},
	{ name : 'HTML/CSS'},
	{ name : 'Java'},
	{ name : 'JavaScript'},
	{ name : 'Python'}
];

var tags = [
	{ name : 'first'},
	{ name : 'second'},
	{ name : 'third'},
	{ name : 'PHP'},
	{ name : 'JavaScript'},
	{ name : 'CSS'}
];

var snippets = [
	{
		title: 'bTest 1',
		preview: "console.log('test 1');",
		description: 'test 1 description with **bold text**',
		parts : snippetParts
	},
	{
		title: 'aTest 2',
		preview: "console.log('test 2');",
		description: 'test 2 description with **bold text**',
		starred: true,
		parts : snippetParts
	},
	{
		title: 'cTest 3',
		preview: "console.log('test 3');",
		description: 'test 3 description with **bold text**',
		parts : snippetParts
	},
	{
		title: 'dTest 4',
		preview: "console.log('test 4');",
		description: 'test 4 description with **bold text**',
		parts : snippetParts
	}
];
module.exports = {snippets : snippets, tags: tags, languages : languages};
