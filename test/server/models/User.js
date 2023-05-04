const orm = require('../utils/model'), Seq = orm.Seq()

module.exports = {
    model: {
        id: {
            type: Seq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        username: {
            type: Seq.STRING,
            allowNull: false,
            unique: true,
            validate: {
                len: [5,16]
            }
        },
        passwordHash: {
            type: Seq.STRING,
            allowNull: false
        },
        role: {
            type: Seq.STRING,
            allowNull: false,
            validate: {
                isValid(value) {
                    if (!(value === 'default' || value === 'developer' || value === 'administrator')) {
                        throw new Error('invalid user role')
                    }
                }
            }
        }
    },
    relations: [{
        hasMany: {
            model: 'Turn',
            options: {
                as: 'accessingUser',
                foreignKey: {
                    name: 'accessingUserId'
                }
            }
        }
    },{
        hasMany: {
            model: 'Turn',
            options: {
                as: 'creatingUser',
                foreignKey: {
                    name: 'creatingUserId'
                }
            }
        }
    }]
}