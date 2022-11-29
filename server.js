const req = require('require-yml');
const config = req(['./config/default.yml', `./config/${process.env.NODE_ENV}.yml`]);
const express = require('express');
const cors = require('cors');
const port = config.api.port;
const app = express();
const bodyParser = require('body-parser');
const db = new (require("./model/Db.js"))(config.database);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//prettify JSON output if in dev mode
if(config.api.prettyPrintJsonResponse){
	app.set('json spaces', 2);
}

app.use(cors({
	origin: '*'
}));

app.get('/snippets', function(req, res) {
	db.model.Snippet.findAll({
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
		// expected output: "Success!"
	}).catch(function(error){
		// error
		res.status(500).json({error : error});
	});
});

app.put('/snippet', async function(req, res) {
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
				where: {id : data.id},
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
			console.log(partId);
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
			}else{
				console.log(tag.name + ' should not be removed');
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
app.post('/snippet', async function(req, res) {
	const data = req.body;

	const t = await db.sequelize.transaction();
	try{
		const snippet = await db.model.Snippet.create(
			{
				title: data.title,
				starred: data.starred,
				preview: data.preview,
				description: data.description,
				parts: data.parts
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


app.delete('/snippet/:id', function(req, res) {
	db.model.Snippet.destroy({
		where: { id: req.params.id }
	}).then((results) => {
		res.json(results);
	}).catch(function(error){
		res.status(500).json({error : error});
	});
});

app.get('/tags', function(req, res) {
	db.model.Tag.findAll({
		include: [
			{
				model: db.model.Snippet,
				as: 'snippets'
			}
		]
	}).then((results) => {
		res.json(results);
		// expected output: "Success!"
	}).catch(function(error){
		// error
		res.status(500).json({error : error});
	});
});

app.get('/languages', function(req, res) {
	db.model.Language.findAll({
		/*attributes: {
		include: [[Sequelize.fn("COUNT", Sequelize.col("sensors.id")), "nbSnippets"]]
		}*/
	}).then((results) => {
		res.json(results);
		// expected output: "Success!"
	}).catch(function(error){
		// error
		res.status(500).json({error : error});
	});
});

/*app.get('/languages', function(req, res) {
  db.model.Language.findAll({
    include: [
      {
        model: db.model.SnippetPart,
        as: 'snip',
        where: {
          languageId : {$col: 'Language.id'}
        }
      }
    ]
  }).then((results) => {
    res.json(results);
    // expected output: "Success!"
  }).catch(function(error){
    // error
    res.status(500).json({error : error});
  });
});*/

app.get('/snippetparts', function(req, res) {
	db.model.SnippetPart.findAll({
		include: [
			{
				model: db.model.Language
			}
		]
	}).then((results) => {
		res.json(results);
		// expected output: "Success!"
	}).catch(function(error){
		// error
		res.status(500).json({error : error});
	});
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
