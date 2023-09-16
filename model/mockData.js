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
	{ name : 'JS'},
	{ name : 'Python'}
];

var tags = [
	{ name : 'Aaa'},
	{ name : 'Bbb'},
	{ name : 'Ccc'},
	{ name : 'Ddd'},
	{ name : 'Eee'},
	{ name : 'Fff'}
];

var snippets = [
	{
		title: 'Optional description',
		// preview: "console.log('test 1');",
		description: ''
		// parts : snippetParts
	},
	{
		title: 'Public gist.test.py',
		// preview: "console.log('test 2');",
		description: 'test 2 description with **bold text**',
		starred: true,
		// parts : snippetParts
	},
	{
		title: 'Private snippet',
		'private' : true,
		// preview: "console.log('test 3');",
		description: 'test 3 description with **bold text**'
		// parts : snippetParts
	},
	{
		title: 'dTest 4',
		// preview: "console.log('test 4');",
		description: 'test 4 description with **bold text**'
		// parts : snippetParts
	}
];

var users = [
	{
		username: 'test UFO',
    passwordHash: '$2b$10$lHuDgPYu5W8vo7wGemrWoOZDmdvPjrWx83C6cd/Toqut4E7CITY1i',
		email: 'mail@test.com',
		githubUsername: 'UFOcatcher'
	},
	{
		username: 'test',
    passwordHash: '$2b$10$lHuDgPYu5W8vo7wGemrWoOZDmdvPjrWx83C6cd/Toqut4E7CITY1i',
		email: 'usertest@test.com',
		githubUsername: ''
	}
];

module.exports = {snippets : snippets, snippetParts : snippetParts, tags: tags, languages : languages, users: users};
