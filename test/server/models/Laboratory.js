const orm = require('../utils/model'), Seq = orm.Seq()

module.exports = {
    model: {
        id: {
            type: Seq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: Seq.STRING,
            allowNull: false,
            unique: true,
            validate: {
                len: [8,50]
            }
        },
        turnDurationMinutes: {
            type: Seq.INTEGER,
            allowNull: false,
            validate: {
                areAllTurnTheSame(value) {
                    if (!((24*60) % value === 0)) {
                        throw new Error(`${value} does not divide the day into equal turns`)
                    }
                }
            }
        },
        ip: {
            type: Seq.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isIP: true
            }
        },
        port: {
            type: Seq.STRING,
            validate: {
                isNumeric: true,
                len: [1,5]
            }
        },
        state: {
            type: Seq.STRING,
            validate: {
                isValid(value) {
                    if (!(value === 'active' || value === 'inactive' || value === 'approval_pending')) {
                        throw new Error('invalid laboratory state')
                    }
                }
            }
        }
    },
    relations: [{
        hasMany: {
            model: 'Turn',
            options: {
                as: 'laboratory',
                foreignKey: {
                    name: 'laboratoryId'
                }
            }
        }
    }]
}