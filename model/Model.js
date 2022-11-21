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
      }
    });
    this.Language.hasMany(this.SnippetPart);
    this.SnippetPart.belongsTo(this.Language);

    this.Snippet = sequelize.define('Snippet', {
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      starred: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      preview: {
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.TEXT
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
  }
}
module.exports = Model;
