const req = require('require-yml');
const fs = require('fs');
const config = req(['./config/default.yml', `./config/${process.env.NODE_ENV}.yml`]);
const express = require('express');
const cors = require('cors');
const port = config.api.port;
const app = express();
const bodyParser = require('body-parser');
const db = new (require("./model/Db.js"))(config.database);
const axios = require('axios');
const { Octokit } = require("octokit");

//prettify JSON output if in dev mode
if(config.api.prettyPrintJsonResponse){
	app.set('json spaces', 2);
}

app.use(cors({
	origin: 'http://localhost:8080'
}));

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', 'http://localhost:8080');
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

/* -- SESSION SUPPORT -- */

app.use(db.session);

const passport = require('passport');
const LocalStrategy = require('passport-local');
const CustomStrategy = require('passport-custom');
const JWTStrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');

const bcrypt = require('bcrypt');

app.use(passport.authenticate('session'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

function hashPassword(password){
  return bcrypt.hashSync(password, 10);
}

function checkPassword(hash, pw){
	return bcrypt.compareSync(pw, hash);
}

function createToken(user){
	return jwt.sign(
		{
			id: user.id,
			username: user.username,
			email: user.email,
			lastLogin: user.lastLogin
		},
		config.JWT.secret
	);
}

async function login(userId){
  try{
    await db.model.User.update(
      {
        lastLogin: db.sequelize.fn('NOW'),
        loggedIn: true
      },
      {
        where: { id : userId }
      }
    );
    
    const user = await db.model.User.findOne(
    	{
      	where: {id: userId},
    	}
    );
    
    var token = createToken(user);
    
    return {
      user: user.dataValues,
      token: token
    };
  }catch{
    return false;
  }
}

async function logout(userId){
  try{
    await db.model.User.update(
      {
        lastLogin: db.sequelize.fn('NOW'),
        loggedIn: false
      },
      {
        where: {id : userId}
      }
    );
    return true;
  }catch{
    return false;
  }
}

// passport.use(
// 	'github-token',
// 	new CustomStrategy(async function(req, done) {
// 		//TODO: try to get user info through their token
// 		//TODO: the app should be told to ask for a github login if the token is expired
// 		//TODO: update user login status

// 		var octokit = new Octokit({ auth: user.githubToken });
// 		//try to authenticate as github user
// 		var github_user = await octokit.request("GET /user", {
// 			headers: {
// 				authorization: user.githubToken
// 			}
// 		});
// 		if(github_user){
// 			user.githubProfile = github_user.data;
// 		}else{//if the authentication fails, the user will be asked to login again
// 			user.askToLogin = true;
// 		}
//     User.findOne({
//       username: req.body.username
//     }, function (err, user) {
//       done(err, user);
//     });
//   }
// ));

passport.use(
  'login',
  new LocalStrategy(
    {
      usernameField: 'username',
      passwordField: 'password'
    },
    async (username, password, done) => {
  		try {
  			const user = await db.model.User.findOne({
  				where: {
  					username : username
  				}
  			});
        
  			if(user && checkPassword(user.passwordHash, password)){
  				const profileAndToken = await login(user.dataValues.id);
  				//TODO connect additional accounts (github etc.)
  				return done(null, profileAndToken);//return user profile + their token
  			}else{
  			  return done(null, false);
  			}
  		}catch(err){
  			return done(null, false);
  		}
    }
  )
);

passport.use(
  'sign-up',
  new LocalStrategy(
    {
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: true
    },
    async (req, username, password, done) => {
			try {
				const user = await db.model.User.create(
					{
						username: username,
						email: req.body.email,
						passwordHash: hashPassword(password)
					}
				);
				
				if(user){
					const profileAndToken = await login(user.id);
					//TODO connect additional accounts (github etc.)
					return done(null, profileAndToken);//return user profile + their token
				}else{
					return done(null, false);
				}
  		}catch(err){
  			return done(null, false);
  		}
    }
  )
);

passport.use(
	'jwt',
  new JWTStrategy(
    {
      secretOrKey: config.JWT.secret,
      jwtFromRequest: ExtractJWT.fromUrlQueryParameter('token')
    },
    async (token, done) => {
      try {
      	const profileAndToken = await login(token.id);
        return done(null, profileAndToken);
      } catch (error) {
        done(error);
      }
    }
  )
);

app.post('/login', passport.authorize('login'), function(req, res) {
  res.json(req.account);
});

app.post('/logout/:id', passport.authorize('jwt', { session: false }), async function(req, res, next) {
	const result = await logout(req.params.id);
  if(result){
  	req.logout(function(err) {
	    if (err) { return next(err); }
	    res.status(500).json({error : 'could not log out'});
	  });
    res.json({message : 'logged out'});
  }else{
    res.status(500).json({error : 'could not log out'});
  }
});

app.post('/sign-up', passport.authorize('sign-up'), function(req, res) {
  res.json(req.account);
  //res.json({'ok' : 'ok'});
});

//TODO NEXT : simple request with token : https://docs.github.com/fr/rest/gists/gists?apiVersion=2022-11-28
app.post('/github-login', async function(req, res){
	//initiate github login to receive a token
	try {
		var github_response = await axios.post('https://github.com/login/oauth/access_token', {
			client_id: config.github.clientId,
			client_secret: config.github.clientSecret,
			code: req.body.code,
			redirect_uri: config.github.redirectURI
		}, {
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			}
		});

		//TODO: sav github token in the database
		var github_token = github_response.data.access_token;
		
		//obtain, store/update and send github user data
		var octokit = new Octokit({ auth: github_token });
		
		var github_user = await octokit.request("GET /user", {
			headers: {
				authorization: github_token
			}
		});

		var [user, created] = await db.model.User.findOrCreate({
	    where: {
	      githubId : github_user.data.id
	    }
		});
		
		await db.model.User.update(
			{
				githubToken: github_token
			},
			{
				where: {
					id: user.id
				}
			}
		);
		
		const profileAndToken = await login(user.dataValues.id);
		
		profileAndToken.user.githubProfile = github_user.data;
		
		// const gists = await octokit.request('GET /gists', {
		// 	headers: {
		// 		authorization: github_token
		// 	}
		// });

		res.json(profileAndToken);
	}catch(error){
		res.status(500).json({error : 'error'});
	}
});

/* -- CRUD routes -- */

app.get('/snippets', passport.authorize('jwt', { session: false }), function(req, res) {
	db.model.Snippet.findAll({
		where: {
			UserId: req.account.user.id
		},
		include: [
			{
				model: db.model.SnippetPart,
				as: 'parts',
				include: [
					{
						model: db.model.Language/*,
						as: 'language'*/
					}
				]
			},
			{
				model : db.model.Tag,
				as : 'tags'
			}
		]
	}).then((results) => {
		res.json(results);
	}).catch(function(error){
		res.status(500).json({error : error});
	});
});

app.put('/snippet', passport.authorize('jwt', { session: false }), async function(req, res) {
	const data = req.body;

	const t = await db.sequelize.transaction();
	try{
		await db.model.Snippet.update(
			{
				title: data.title,
				starred: data.starred,
				preview: data.preview,
				description: data.description,
				parts: data.parts
			},
			{
				where: {
					id : data.id,
					UserId: req.account.user.id
				},
				transaction: t
			}
		);

		var partsToKeepIds = [];

		const snippet = await db.model.Snippet.findByPk(data.id, {
			include: [
				{
					model : db.model.Tag,
					as : 'tags'
				}
			],
			transaction: t
		});

		//create new parts and edit modified parts
		await Promise.all(data.parts.map(async (part) => {
			let partId = part.id || null;
			let newPart = false;
			if(!partId){//the part needs to be created
				const p = await db.model.SnippetPart.create(
					{
						title: part.title,
						content: part.content
					},
					{
						transaction: t
					}
				);
				partId = p.id;
				newPart = true;
			}else{//the part already exists and needs an update
				await db.model.SnippetPart.update(
					{
						title: part.title,
						content: part.content
					},
					{
						where: {id : partId},
						transaction: t
					}
				);
			}

			const savedPart = await db.model.SnippetPart.findByPk(partId, { transaction: t });
			//bind language to part
			const [row, created] = await db.model.Language.findOrCreate({
				where: {name : part.language},
				transaction: t
			});
			await savedPart.setLanguage(row.id, {transaction: t});
			if(newPart){
				await snippet.addPart(savedPart, {transaction: t});
			}
			partsToKeepIds.push(partId);
		}));

		//delete the parts that were removed from the list
		//aka they can be found on the snippet in the data base but not on the submitted snippet
		await db.model.SnippetPart.destroy({
			where: {
				SnippetId : data.id,
				id: {
					[db.Sequelize.Op.notIn]: partsToKeepIds
				}

			},
			transaction: t
		});

		//find or create + link all the tags in list
		await Promise.all(data.tags.map(async (tag) => {
			const [row, created] = await db.model.Tag.findOrCreate({
				where: { name: tag },
				tansaction: t
			});
			await db.model.SnippetTags.findOrCreate({
				where: {
					SnippetId: snippet.id,
					TagId: row.id
				},
				transaction: t
			});
		}));

		//detach removed tags (tags that are linked to the snippet but absent from provided tag list)
		await Promise.all(snippet.tags.map(async (tag) => {
			if(!data.tags.includes(tag.name)){
				await db.model.SnippetTags.destroy({
					where: {
						SnippetId : snippet.id,
						TagId: tag.id
					},
					transaction: t
				});
			}
		}));

		const result = await db.model.Snippet.findByPk(data.id, {
			include: [
				{
					model: db.model.SnippetPart,
					as: 'parts',
					include: [
						{
							model: db.model.Language/*,
							as: 'language'*/
						}
					]
				},
				{
					model : db.model.Tag,
					as : 'tags'
				}
			],
			transaction: t
		});

		await t.commit();
		res.json(result);

	}catch(error){
		await t.rollback();
		res.status(500).json({error : error});
	}
});
app.post('/snippet', passport.authorize('jwt', { session: false }), async function(req, res) {
	const data = req.body;

	const t = await db.sequelize.transaction();
	try{
		const snippet = await db.model.Snippet.create(
			{
				title: data.title,
				starred: data.starred,
				preview: data.preview,
				description: data.description,
				parts: data.parts,
				UserId: req.account.user.id
			},
			{
			include : [
				{ model : db.model.SnippetPart, as: 'parts' },
			],
			transaction: t
		});

		await Promise.all(snippet.parts.map(async (part, index) => {
			const [row, created] = await db.model.Language.findOrCreate({
				where: {name : data.parts[index].language},
				transaction: t
			});
			await part.setLanguage(row.id, {transaction: t});
		}));

		await Promise.all(data.tags.map(async (tag) => {
			const [row, created] = await db.model.Tag.findOrCreate({
				where: { name : tag },
				transaction: t
			});
			await snippet.addTag(row.id, {transaction: t});
		}));

		const result = await db.model.Snippet.findByPk(snippet.id, {
			include: [
				{
					model: db.model.SnippetPart,
					as: 'parts',
					include: [
						{
							model: db.model.Language/*,
							as: 'language'*/
						}
					]
				},
				{
					model : db.model.Tag,
					as : 'tags'
				}
			],
			transaction: t
		});

		await t.commit();
		res.json(result);

	}catch(error){
		await t.rollback();
		res.status(500).json({error : error});
	}
});


app.delete('/snippet/:id', passport.authorize('jwt', { session: false }), function(req, res) {
	db.model.Snippet.destroy({
		where: {
			id: req.params.id,
			UserId: req.account.user.id
		}
	}).then((results) => {
		res.json(results);
	}).catch(function(error){
		res.status(500).json({error : error});
	});
});

app.get('/tags', passport.authorize('jwt', { session: false }), async function(req, res) {
	try{
		var results = await db.model.Tag.findAll({
			include: [
				{
					model: db.model.Snippet,
					as: 'snippets',
					required: true,
					where: {
						UserId: req.account.user.id
					}
				}
			]
		});
		
		results.forEach(function(t){
			t.dataValues.nbSnippets = t.snippets.length;
		});
		
		res.json(results);
	}catch(error){
		res.status(500).json({error : error});
	}
});

app.get('/languages', passport.authorize('jwt', { session: false }), async function(req, res) {
	try{
		var results = await db.model.Language.findAll({
			include: [
	      {
	      	model: db.model.SnippetPart,
	      	required: true,
	        include: [
	        	{
	        		model: db.model.Snippet,
	        		required: true,
	        		where: {
								UserId: req.account.user.id
							}
	        	}
	        ]
	      }
	    ]
		});
		
		results.forEach(function(l){
			var snippetIds = [];
			l['SnippetParts'].forEach(function(part){
				var id = part['Snippet']['id'];
				if(snippetIds.indexOf(id) === -1){
					snippetIds.push(id);
				}
			})
			l.dataValues.nbSnippets = snippetIds.length;
		});
		
		res.json(results);
	}catch(error){
		res.status(500).json({error : error});
	}
});

function init(){
	db.init().then(() => {
		console.log(`Starting Sequelize + Express example on port ${port}...`);

		app.listen(port, () => {
			console.log(`Express server started on port ${port}. Try some routes, such as '/api/users'.`);
		});
	});
}
init();
