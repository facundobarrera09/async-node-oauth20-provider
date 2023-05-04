const orm = require('../utils/model'), Seq = orm.Seq()

module.exports = {
    // id:             'client1.id',
    // name:           'client1.name',
    // secret:         'client1.secret',
    // redirectUri:    'http://127.0.0.1:3000',
    // grants:         'authorization_code'
    model: {
        id: {
            type: Seq.STRING,
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
        secret: {
            type: Seq.STRING,
            allowNull: false
        },
        redirectUri: {
            type: Seq.STRING,
            allowNull: false,
        },
        grants: {
            type: Seq.STRING,
        },
        scope: {
            type: Seq.STRING,
        }
    },
}