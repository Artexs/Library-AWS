import {
    DynamoDBClient, ListTablesCommand, GetItemCommand
} from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient, GetCommand, DeleteCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
const ddbClient = new DynamoDBClient({ region: 'eu-north-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const dynamodbTableName = 'Library';

const healthPath = '/health';
const userPath = '/user';
const bookPath = '/book';
const booksPath = '/books';

export const handler = async (event) => {
    console.log('Request event: ', event);
    let response;
    switch (true) {
        case event.httpMethod === 'GET' && event.path === healthPath:
            response = buildResponse(200, 'Succesfully connected.');
            break;
        case event.httpMethod === 'GET' && event.path === booksPath:
            response = getBooks();
            break;
        case event.httpMethod === 'GET' && event.path === bookPath:
            response = getBook(event.queryStringParameters.bookId);
            break;
        case event.httpMethod === 'POST' && event.path === bookPath:
            const command = new PutCommand({
                TableName: dynamodbTableName,
                Item: event.queryStringParameters
            });
            response = addBook(command);
            break;
        case event.httpMethod === 'PATCH' && event.path === bookPath:
            if (event.queryStringParameters.UpdatedKey === 'BookName') {
                response = modifyBook(event.queryStringParameters.bookId,
                    event.queryStringParameters.UpdatedKey,
                    event.queryStringParameters.BookName);
            } else
                response = buildResponse(202, "202 You can't change that parameter");
            break;
        case event.httpMethod === 'DELETE' && event.path === bookPath:
            response = deleteBook(event.queryStringParameters.bookId);
            break;
        case event.httpMethod === 'GET' && event.path === userPath:
            response = getBook(event.queryStringParameters.bookId);
            break;
        case event.httpMethod === 'POST' && event.path === userPath:
            if (event.queryStringParameters.UpdatedKey === 'BorrowerName') {
                response = modifyBook(event.queryStringParameters.bookId,
                    event.queryStringParameters.UpdatedKey,
                    event.queryStringParameters.BorrowerName);
            } else
                response = buildResponse(202, "202 You can't change that parameter");
            break;
        case event.httpMethod === 'DELETE' && event.path === userPath:
            response = modifyBook(event.queryStringParameters.bookId, 'BorrowerName', '');
            break;
        default:
            response = buildResponse(404, '404 Not Found');
    }
    return response;
}
async function getBooks() {
    const command = new ScanCommand({
        ProjectionExpression: "#bookId, BookName, BorrowerName",
        ExpressionAttributeNames: { "#bookId": "bookId" },
        TableName: dynamodbTableName,
    });
    const response = await docClient.send(command);
    const body = {
        products: response
    }
    return buildResponse(200, body);
}
async function getBook(bookId) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'bookId': { 'S': bookId }
        }
    }
    const data = await ddbClient.send(new GetItemCommand(params));
    return buildResponse(200, data);
}
async function addBook(requestBody) {
    await docClient.send(requestBody);
    const body = {
        Operation: 'SAVE',
        Message: 'SUCCESS',
        Item: requestBody
    }
    return buildResponse(200, body);
}
async function modifyBook(bookId, updateKey, updateValue) {
    const params = new UpdateCommand({
        TableName: dynamodbTableName,
        Key: {
            'bookId': bookId,
        },
        UpdateExpression: `set ${updateKey} = :value`,
        ExpressionAttributeValues: {
            ':value': updateValue
        },
        ReturnValues: "ALL_NEW",
    });

    const data = await docClient.send(params);
    const body = {
        Operation: 'UPDATE',
        Message: 'SUCCESS',
        UpdatedAttributes: data
    }
    return buildResponse(200, body);
}
async function deleteBook(bookId) {
    const deleteCommand = new DeleteCommand({
        TableName: dynamodbTableName,
        Key: {
            'bookId': bookId
        },
    });
    const data = await docClient.send(deleteCommand);
    return buildResponse(200, data);
}



function buildResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    }
}