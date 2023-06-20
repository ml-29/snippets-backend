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

	async fill(){
		try{
			//drop db and add filler data
			this.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
			await this.sequelize.drop();
			this.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
			await this.sequelize.sync();
	
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
			var languages = [];
			var snippets = [];
	
			this.mockData.tags.forEach((tag) => {
				this.model.Tag.create(tag).then((tag) => {
					tags.push(tag);
				});
			});
	
			this.mockData.languages.forEach((language) => {
				this.model.Language.create(language).then((language) => {
					languages.push(language);
				});
			});
	
			await Promise.all(this.mockData.snippets.map(async (snippet) => {
				await this.model.Snippet.create(snippet, {
					include : [
						{model : this.model.SnippetPart, as: 'parts'}
					]
				}).then((snippet) => {
					snippet.addTags(getRandom(tags, 3));
					snippet.parts.forEach((part) => {
						var lang = languages.find(l => l.name == part.title);
						part.setLanguage(lang.id);
						// part.setLanguage(getRandom(languages, 1)[0].id);
					});
					snippets.push(snippet);
				});
			}));
	
			this.mockData.users.forEach((user) => {
			 this.model.User.create(user).then((user) => {
				user.addSnippets(getRandom(snippets, 2));
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

		if(this.fillWithMockData){
			await this.fill();
		}
		await this.sessionStore.sync();
	}
}
module.exports = Db;
