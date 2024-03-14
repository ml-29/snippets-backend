class Db {
	constructor(config){
		this.fillWithMockData = config.fillWithMockData;
		this.Sequelize = require('sequelize');
		this.mockData = require('./mockData.js');
		this.sequelize = new this.Sequelize(config.name, config.user, config.password, {
			host: config.host,
			dialect: config.dialect
		});
		this.model = new (require('./Model.js'))(this.sequelize, this.Sequelize);


		/* -- init session support -- */
		const expressSession = require('express-session');
		
		const SequelizeStore = require('connect-session-sequelize')(expressSession.Store);

		this.sessionStore = new SequelizeStore({
			db: this.sequelize,
			checkExpirationInterval: 15 * 60 * 1000,
			expiration: 7 * 24 * 60 * 60 * 1000
		});

		this.session = expressSession({
			secret: 'keyboard cat',
			resave: false,
			saveUninitialized: false,
			store: this.sessionStore
		});

		// this.sessionStore.sync();
	}
	
	async fillWithMinimalData(){
		//drop db and add filler data
		await this.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
		await this.sequelize.drop();
		await this.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
		await this.sequelize.sync();
		
		await Promise.all(this.mockData.languages.map(async (language) => {
			var cl = await this.model.Language.create(language);
			await Promise.all(this.mockData.extensions.map(async (ext) => {
				if(ext.name == language.name){
					await Promise.all(ext.extensions.map(async (e) => {
						var [ce, created] = await this.model.Extension.findOrCreate({
							where: { name: e }
						});
						ce.setLanguage(cl.id);
					}));
				}
			}));
		}));

		// const [row, created] = await db.model.Language.findOrCreate({
		// 			where: {name : s.parts[index].language},
		// 			transaction: t
		// 		});
		// 		await part.setLanguage(row.id, {transaction: t});

		// //add extensions
		// await Promise.all(this.mockData.extensions.map(async (extension) => {
		// 	await this.model.Extension.create(language);
		// }));

	}
	
	async fill(){
		try{
			function getRandom(arr, n) {
				var result = new Array(n),
					len = arr.length,
					taken = new Array(len);
				if (n > len)
					throw new RangeError("getRandom: more elements taken than available");
				while (n--) {
					var x = Math.floor(Math.random() * len);
					result[n] = arr[x in taken ? taken[x] : x];
					taken[x] = --len in taken ? taken[len] : len;
				}
				return result;
			}
	
			var tags = [];
			var languages = await this.model.Language.findAll();
			var snippets = [];
	
			this.mockData.tags.forEach((tag) => {
				this.model.Tag.create(tag).then((tag) => {
					tags.push(tag);
				});
			});

			await Promise.all(this.mockData.snippets.map(async (snippet) => {
				var snip = snippet;
				snip.parts = getRandom(this.mockData.snippetParts, 2);
				await this.model.Snippet.create(snip, {
					include : [
						{model : this.model.SnippetPart, as: 'parts'}
					]
				}).then((snippet) => {
					snippet.addTags(getRandom(tags, 2));
					snippet.parts.forEach((part) => {
						var p = this.mockData.snippetParts.find((element) => element.title == part.title);
						// var lang = languages.find(l => l.name == part.title);
						var lang = languages.find((element) => element.name == p.language);
						part.setLanguage(lang.id);
						// part.setLanguage(getRandom(languages, 1)[0].id);
					});
					snippets.push(snippet);
				});
			}));
	
			this.mockData.users.forEach((user) => {
			 this.model.User.create(user).then((user) => {
				// user.addSnippets(getRandom(snippets, 4));
				if(user.username == 'test'){
					user.addSnippets(snippets);
				}
			 });
			});
		}catch(error){
			console.log(error);
		}
	}

	async assertDatabaseConnectionOk() {
		console.log(`Checking database connection...`);
		try {
			await this.sequelize.authenticate();
			console.log('Database connection OK!');
		} catch (error) {
			console.log('Unable to connect to the database:');
			console.log(error.message);
			process.exit(1);
		}
	}

	async init() {
		await this.assertDatabaseConnectionOk();

		await this.fillWithMinimalData();
		
		if(this.fillWithMockData){
			await this.fill();
		}
		await this.sessionStore.sync();
	}
}
module.exports = Db;
