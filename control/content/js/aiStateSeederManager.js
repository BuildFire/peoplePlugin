const aiStateSeederManager = {
    aiStateSeeder: null,
    tagCollectionName: 'people',
    controllers: null,
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
    init() {
        const angular = window.angular;

        if (angular && angular.module) {
            const peopleEnumsModule = angular.module('peopleEnums');
            const peopleServicesModule = angular.module('peopleServices');

            if (peopleEnumsModule) {
                this.tagCollectionName = angular
                    .injector(['ng', 'peopleEnums'])
                    .get('COLLECTIONS').people;
            }

            if (peopleServicesModule) {
                const dbService = angular
                    .injector(['ng', 'peopleServices'])
                    .get('DB');
                this.controllers = new dbService(this.tagCollectionName);
            }
        }

        this.aiStateSeeder = new buildfire.components.aiStateSeeder({
            generateOptions: {
                userMessage:
                    'Generate a sample list of contacts for people working on [business-type]',
                systemMessage:
                    'Each contact should have a first name, last name, phone number, avatar in png format, bio, position, email. Use https://avatars.dicebear.com/api/avataaars/ to generate a useable avatars urls. bio as html content',
                jsonTemplate: this.jsonTemplate,
                callback: this._handleGenerate.bind(this),
            },

            importOptions: {
                jsonTemplate: this.jsonTemplate,
                sampleCSV:
                    'Jane, Smith, 123-456-7890, https://avatars.dicebear.com/api/avataaars/jane-smith.png?mouth=smile&eyebrows=defaultNatural&eyes=default,<p>Jane Smith is a marketing specialist with expertise in digital marketing strategies.</p>,Marketing Specialist,Jane.Smith@example.com\n\r John, Doe, 123-456-7890, https://avatars.dicebear.com/api/avataaars/john-doe.png?mouth=smile&eyebrows=defaultNatural&eyes=default,<p>John Doe is a software engineer with 5 years of experience in web development.</p>,Software Engineer,john.doe@example.com',
                systemMessage: `fName is first , last name is lname, phone is random phone numbers, topImage is a URL`,
                callback: this._handleImport.bind(this),
            },
        }).smartShowEmptyState(null);
    },

    _bulkDelete() {
        return this.controllers.find({}).then((results) => {
            const dataToDelete = results.map((result) => result.id);
            const deletePromises = dataToDelete.map((id) => {
                return this.controllers.delete(id);
            });
            return Promise.all(deletePromises)
                .then((deletedResults) => {
                    console.log('Data deleted successfully:', deletedResults);
                    return deletedResults;
                })
                .catch((err) => {
                    console.error('Error deleting data:', err);
                });
        });
    },

    _handleGenerate(err, data) {
        if (!this._isValidObject(data)) {
            console.error(err || 'Invalid data received');
            return;
        }

        if (!this._isValidArray(data)) {
            console.error('The list must be an array');
            return;
        }

        data.data = this.addQueryParam(data.data);

        this._bulkDelete()
            .then((res) => {
                if (res) {
                    this.controllers
                        .insert(data.data)
                        .then(() => {
                            window.updateContentHomeItems(data.data);
                            this.aiStateSeeder.requestResult.complete();
                        })
                        .catch((err) => console.error(err));
                }
            })
            .catch((err) => console.error(err));
    },

    _handleImport(err, data) {
        if (!this._isValidObject(data)) {
            console.error(err || 'Invalid data received');
            return;
        }

        if (!this._isValidArray(data)) {
            console.error('The list must be an array');
            return;
        }

        data.data = this.addQueryParam(data.data);

        if (this.aiStateSeeder.requestResult.resetData) {
            this._bulkDelete()
                .then((res) => {
                    if (res) {
                        this.controllers
                            .insert(data.data)
                            .then(() => {
                                window.updateContentHomeItems(data.data);
                                this.aiStateSeeder.requestResult.complete();
                            })
                            .catch((err) => console.error(err));
                    }
                })
                .catch((err) => console.error(err));
        } else {
            this.controllers
                .insert(data.data)
                .then(() => {
                    window.updateContentHomeItems(data.data);
                    this.aiStateSeeder.requestResult.complete();
                })
                .catch((err) => console.error(err));
        }
    },

    addQueryParam(items) {
        const queryParams = [
            'mouth=smile',
            'eyebrows=defaultNatural',
            'eyes=default',
        ];

        return items.map((item) => {
            item.topImage = item.topImage.includes('?')
                ? item.topImage + '&' + queryParams.join('&')
                : item.topImage + '?' + queryParams.join('&');
            return item;
        });
    },

    _isValidObject(data) {
        return data && typeof data === 'object' && Object.keys(data).length > 0;
    },

    _isValidArray(data) {
        const list = Object.values(data)[0];
        return Array.isArray(list);
    },
};
