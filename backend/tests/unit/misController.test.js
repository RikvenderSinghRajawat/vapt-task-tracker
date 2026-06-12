const mockingoose = require('mockingoose');
const Mis = require('../../src/models/Mis');
const misController = require('../../src/controllers/misController');

const httpMocks = require('node-mocks-http');

describe('MIS Controller - create and get summary', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  test('createEntry should create entry and return 201', async () => {
    const fakeEntry = { _id: '507f1f77bcf86cd799439011', title: 'Test Entry', user: '507f1f77bcf86cd799439012' };
    jest.spyOn(Mis, 'create').mockResolvedValue(fakeEntry);
    jest.spyOn(require('../../src/models/AuditLog'), 'create').mockResolvedValue({});

    const req = httpMocks.createRequest({
      method: 'POST',
      url: '/mis',
      body: { title: 'Test Entry' },
      user: { _id: '507f1f77bcf86cd799439012' }
    });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    await misController.createEntry(req, res, next);
    expect(res.statusCode).toBe(201);
    const data = res._getJSONData();
    expect(data.success).toBe(true);
    expect(data.data.title).toBe('Test Entry');
  });

  test('getMyMisSummary should return summary object', async () => {
    // mock aggregate and distinct calls used inside the controller
    mockingoose(Mis).toReturn([], 'aggregate');
    mockingoose(Mis).toReturn([], 'distinct');
    mockingoose(Mis).toReturn(null, 'findOne');

    const req = httpMocks.createRequest({ method: 'GET', url: '/mis/summary', user: { _id: '507f1f77bcf86cd799439012' } });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    await misController.getSummary(req, res, next);
    expect(res.statusCode).toBe(200);
    const body = res._getJSONData();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('today');
    expect(body.data).toHaveProperty('week');
  });
});
