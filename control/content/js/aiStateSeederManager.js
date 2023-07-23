const jsonTemplate = [
    {
        fName: '',
        lName: '',
        phone: '',
        topImage: '',
        bodyContent: '',
        position: '',
        email: '',
    },
];

const aiStateSeederManager = {
    aiStateSeeder: null,
    tagCollectionName: 'people',
    controllers: null,
    generateOptions: {
        userMessage:
            'Generate a sample list of contacts for people working on IT company',
        systemMessage:
            'Maximum size should be 5 contacts, each contact should have a first name, last name, phone number, avatar in png format, bio, position, email. Use dicebear.com to generate a useable avatars urls. bio as html content',
        jsonTemplate: jsonTemplate,
    },

    importOptions: {
        jsonTemplate: jsonTemplate,
        sampleCsv:
            'Jane, Smith, 123-456-7890, https://avatars.dicebear.com/api/avataaars/jane-smith.png?mouth=smile&eyebrows=defaultNatural&eyes=default,<p>Jane Smith is a marketing specialist with expertise in digital marketing strategies.</p>,Marketing Specialist,Jane.Smith@example.com\n\r John, Doe, 123-456-7890, https://avatars.dicebear.com/api/avataaars/john-doe.png?mouth=smile&eyebrows=defaultNatural&eyes=default,<p>John Doe is a software engineer with 5 years of experience in web development.</p>,Software Engineer,john.doe@example.com',
        systemMessage: `Maximum size should be 5, fName is first , last name is lname, phone is random phone numbers, topImage is a URL`,
    },
    init() {
        let angular = window.angular;

        if (angular && angular.module) {
            if (angular.module('peopleEnums')) {
                this.tagCollectionName = angular
                    .injector(['ng', 'peopleEnums'])
                    .get('COLLECTIONS').people;
            }
            if (angular.module('peopleServices')) {
                const dbService = angular
                    .injector(['ng', 'peopleServices'])
                    .get('DB');
                this.controllers = new dbService(this.tagCollectionName);
            }
        }

        this.aiStateSeeder = new buildfire.components.aiStateSeeder({
            generateOptions: this.generateOptions,
            importOptions: this.importOptions,
        }).smartShowEmptyState(null, this._handleInsertion.bind(this));
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

    _handleInsertion(err, data) {
        if (
            err ||
            !data ||
            typeof data !== 'object' ||
            !Object.keys(data).length
        ) {
            return console.error(err);
        }
        let list = Object.values(data)[0];
        if (!Array.isArray(list)) {
            return console.error('The list must be an array');
        }

        data.data = this.addQueryParam(data.data);

        if (this.aiStateSeeder.requestType === 'generate') {
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
        } else if (this.aiStateSeeder.requestType === 'import') {
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
        let modifiedArray = [];
        let queryParams = [
            'mouth=smile',
            'eyebrows=defaultNatural',
            'eyes=default',
        ];
        modifiedArray = items.map((item) => {
            item.topImage = item.topImage.includes('?')
                ? item.topImage + '&' + queryParams.join('&')
                : item.topImage + '?' + queryParams.join('&');
            return item;
        });
        return modifiedArray;
    },
};
