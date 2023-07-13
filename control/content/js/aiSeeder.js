const initAiStateSeeder = () => {
    const smartShowEmptyState = new buildfire.components.aiStateSeeder({
        generateOptions: {
            userMessage: 'Generate a dummy list of contacts, up to 5 contacts',
            systemMessage:
                'Each contact should have a first name, last name, phone number and avatar in png format, bio, position, email. Use dicebear.com to generate a useable avatars urls. bio as html content',
            jsonTemplate: [
                {
                    fName: '',
                    lName: '',
                    phone: '',
                    topImage: '',
                    bodyContent:'',
                    position:'',
                    email:''
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
                    bodyContent:'',
                    position:'',
                    email:''
                },
            ],
            sampleCsv:
                'Jane, Smith, 123-456-7890, https://avatars.dicebear.com/api/avataaars/jane-smith.png,<p>John Doe is a software engineer with 5 years of experience in web development.</p>,Software Engineer,Marketing Specialist\n\r John, Doe, 123-456-7890, https://avatars.dicebear.com/api/avataaars/john-doe.png,<p>John Doe is a software engineer with 5 years of experience in web development.</p>,Software Engineer,john.doe@example.com',
            systemMessage: `fName is first , last name is lname, phone is random phone numbers, topImage is a URL`,
        },
    }).smartShowEmptyState({ selector: this.selector }, (err, data) => {
        console.log(
            '🚀 ~ file: index.html:77 ~ .smartShowEmptyState ~ data:',
            data
        );
        if (
            err ||
            !data ||
            typeof data !== 'object' ||
            !Object.keys(data).length
        ) {
            return;
        }
        let list = Object.values(data)[0];
        if (!Array.isArray(list)) {
            return;
        }
        bulkDelete('people').then((res) => {
            if (res) {
                bulkInsert(data.data, 'people', (err, data) => {
                    if (data) {
                        smartShowEmptyState.requestResult.complete();
                        window.location.reload();
                    }
                });
            }
        });
    });
};

const bulkInsert = (data, tag, callback) => {
    buildfire.datastore.bulkInsert(data, tag, (err, result) => {
        if (err) {
            console.error('Error inserting data:', err);
        } else {
            console.log('Data inserted successfully:', result);
            callback(null, result);
        }
    });
};

const bulkDelete = (tag) => {
    return new Promise((resolve, reject) => {
        buildfire.datastore.search({}, tag, (err, results) => {
            if (err) {
                console.error('Error searching for data:', err);
            } else {
                const dataToDelete = results.map((result) => result.id);
                const deletePromises = dataToDelete.map((id) => {
                    return new Promise((resolve, reject) => {
                        buildfire.datastore.delete(id, tag, (err, result) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(result);
                            }
                        });
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
        });
    });
};
