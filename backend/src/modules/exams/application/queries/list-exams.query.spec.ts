import { ListExamsQueryHandler } from './list-exams.query';

describe('ListExamsQueryHandler', () => {
  let handler: ListExamsQueryHandler;
  let repo: any;

  beforeEach(() => {
    repo = { findAll: jest.fn() };
    handler = new ListExamsQueryHandler(repo);
  });

  it('should return empty array for now', async () => {
    const result = await handler.execute();
    expect(result).toEqual([]);
  });
});
