class Model {
	constructor(sequelize, Sequelize){
		this.SnippetPart = sequelize.define('SnippetPart', {
			title : {
				type: Sequelize.TEXT
			},
			content : {
				type: Sequelize.TEXT,
				allowNull: false
			}
		});
		this.Language = sequelize.define('Language', {
			name: {
				type : Sequelize.STRING,
				allowNull: false,
				unique: true
			},
			aceEditorPlugin: {
				type : Sequelize.STRING
			}
		});
		this.Language.hasMany(this.SnippetPart);
		this.SnippetPart.belongsTo(this.Language);

		this.Snippet = sequelize.define('Snippet', {
			id: {
				type: Sequelize.UUID,
				defaultValue: Sequelize.UUIDV4,
				allowNull: false,
				primaryKey: true
			},
			title: {
				type: Sequelize.STRING,
				allowNull: false
			},
			starred: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: false
			},
			'private': {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: false
			},
			// preview: {
			// 	type: Sequelize.STRING
			// },
			description: {
				type: Sequelize.TEXT,
				allowNull: true
			}
		});
		this.Snippet.hasMany(this.SnippetPart, {
			as: 'parts',
			onDelete: 'CASCADE'
		});
		this.SnippetPart.belongsTo(this.Snippet);

		this.Tag = sequelize.define('Tag', {
			name: {
				type : Sequelize.STRING,
				allowNull: false,
				unique: true
			}
		});
		this.SnippetTags = sequelize.define('SnippetTags', {
			TagId : {
				type: Sequelize.INTEGER,
				references: {
					model: this.Tag,
					key: 'id'
				}
			},
			SnippetId : {
				type: Sequelize.INTEGER,
				references: {
					model: this.Snippet,
					key: 'id'
				}
			}
		});

		this.Snippet.belongsToMany(this.Tag, {
			as: 'tags',
			through: this.SnippetTags
		});
		this.Tag.belongsToMany(this.Snippet, {
			as: 'snippets',
			through: this.SnippetTags
		});

		this.User = sequelize.define('User', {
			username: {
				type: Sequelize.STRING,
				unique: true
			},
			email: {//TODO : allow to login with username or email
				type: Sequelize.STRING,
				unique: true
			},
			passwordHash: {
				type: Sequelize.STRING
			},
			githubId: {
				type: Sequelize.STRING,
				unique: true
			},
			githubToken: {
				type: Sequelize.STRING
			},
			githubRefreshToken: {//maybe delete later
				type: Sequelize.STRING
			},
			avatar: {
				type: Sequelize.STRING
			},
			loggedIn: {
				type: Sequelize.BOOLEAN,
				defaultValue: false
			},
			lastLogin: {
				type: Sequelize.DATE
			}
		});
		this.User.hasMany(this.Snippet, {
			as: 'snippets',
			onDelete: 'CASCADE'
		});
		this.Snippet.belongsTo(this.User);
	}
}
module.exports = Model;
