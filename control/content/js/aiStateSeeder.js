const initAiStateSeeder = {
    aiStateSeeder: null,
    dbProvider: 'datastore',
    tagCollectionName: null,
    generateOptions: {
        userMessage: 'Generate a dummy list of contacts, up to 5 contacts',
        systemMessage:
            'Each contact should have a first name, last name, phone number, avatar in png format, bio, position, email. Use dicebear.com to generate a useable avatars urls. bio as html content',
        jsonTemplate: [
            {
                fName: '',
                lName: '',
                phone: '',
                topImage: '',
                bodyContent: '',
                position: '',
                email: '',
            },
        ],
    },

    importOptions: {
        jsonTemplate: [
            {
                fName: '',
                lName: '',
                phone: '',
                topImage: '',
                bodyContent: '',
                position: '',
                email: '',
            },
        ],
        sampleCsv:
            'Jane, Smith, 123-456-7890, https://avatars.dicebear.com/api/avataaars/jane-smith.png,<p>John Doe is a software engineer with 5 years of experience in web development.</p>,Software Engineer,Marketing Specialist\n\r John, Doe, 123-456-7890, https://avatars.dicebear.com/api/avataaars/john-doe.png,<p>John Doe is a software engineer with 5 years of experience in web development.</p>,Software Engineer,john.doe@example.com',
        systemMessage: `fName is first , last name is lname, phone is random phone numbers, topImage is a URL`,
    },
    init(dbProvider, tagCollectionName) {
        this.dbProvider = dbProvider;
        this.tagCollectionName = tagCollectionName;
        return new Promise((resolve, reject) => {
            if (!tagCollectionName) {
                return reject('Please provide a collection tag name');
            }
            if (!dbProvider) {
                return reject('Please provide a database provider');
            }
            this.aiStateSeeder = new buildfire.components.aiStateSeeder({
                generateOptions: this.generateOptions,
                importOptions: this.importOptions,
            }).smartShowEmptyState(null, this._handleInsertion.bind(this));
        });
    },

    _bulkInsert(data) {
        return new Promise((resolve, reject) => {
            buildfire[this.dbProvider].bulkInsert(
                data,
                this.tagCollectionName,
                (err, result) => {
                    if (err) {
                        return reject(err);
                    } else {
                        resolve(result);
                    }
                }
            );
        });
    },

    _bulkDelete() {
        return new Promise((resolve, reject) => {
            buildfire[this.dbProvider].search(
                {},
                this.tagCollectionName,
                (err, results) => {
                    if (err) {
                        console.error('Error searching for data:', err);
                    } else {
                        const dataToDelete = results.map((result) => result.id);
                        const deletePromises = dataToDelete.map((id) => {
                            return new Promise((resolve, reject) => {
                                buildfire[this.dbProvider].delete(
                                    id,
                                    this.tagCollectionName,
                                    (err, result) => {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolve(result);
                                        }
                                    }
                                );
                            });
                        });

                        Promise.all(deletePromises)
                            .then((deletedResults) => {
                                console.log(
                                    'Data deleted successfully:',
                                    deletedResults
                                );
                                resolve(deletedResults);
                            })
                            .catch((err) => {
                                reject('Error deleting data:', err);
                            });
                    }
                }
            );
        });
    },

    _handleInsertion(err, data) {
        if (
            err ||
            !data ||
            typeof data !== 'object' ||
            !Object.keys(data).length
        ) {
            return reject(err);
        }
        let list = Object.values(data)[0];
        if (!Array.isArray(list)) {
            return reject('The list must be an array');
        }
        if (this.aiStateSeeder.requestType === 'generate') {
            this._bulkDelete()
                .then((res) => {
                    if (res) {
                        this._bulkInsert(data.data)
                            .then((result) => {
                                this.aiStateSeeder.requestResult.complete();
                                window.location.reload();
                            })
                            .catch((err) => console.error(err));
                    }
                })
                .catch((err) => console.error(err));
        } else if (this.aiStateSeeder.requestType === 'import') {
            this._bulkInsert(data.data)
                .then((result) => {
                    this.aiStateSeeder.requestResult.complete();
                    window.location.reload();
                })
                .catch((err) => console.error(err));
        }
    },
};
