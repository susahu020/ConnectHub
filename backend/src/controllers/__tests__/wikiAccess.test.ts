import { canAccessPage, isModerator, canCreateOrPublishWikiPage } from '../wiki.controller';

describe('isModerator', () => {
  it('treats ADMIN as a moderator', () => {
    expect(isModerator('ADMIN')).toBe(true);
  });

  it('treats MANAGER as a moderator', () => {
    expect(isModerator('MANAGER')).toBe(true);
  });

  it('does not treat EMPLOYEE as a moderator', () => {
    expect(isModerator('EMPLOYEE')).toBe(false);
  });

  it('does not treat an undefined role as a moderator', () => {
    expect(isModerator(undefined)).toBe(false);
  });
});

describe('canAccessPage', () => {
  const publishedPage = { isPublished: true, authorId: 'author-1' };
  const draftPage = { isPublished: false, authorId: 'author-1' };

  it('lets anyone view a published page, regardless of role', () => {
    expect(canAccessPage(publishedPage, 'random-user', 'EMPLOYEE')).toBe(true);
    expect(canAccessPage(publishedPage, 'random-user', undefined)).toBe(true);
  });

  it('lets the author view their own draft', () => {
    expect(canAccessPage(draftPage, 'author-1', 'EMPLOYEE')).toBe(true);
  });

  it('lets an Admin view any draft, even if not the author', () => {
    expect(canAccessPage(draftPage, 'admin-1', 'ADMIN')).toBe(true);
  });

  it('lets a Manager view any draft, even if not the author (moderator access)', () => {
    expect(canAccessPage(draftPage, 'manager-1', 'MANAGER')).toBe(true);
  });

  it('does NOT let a plain Employee view someone else\'s draft', () => {
    expect(canAccessPage(draftPage, 'other-employee', 'EMPLOYEE')).toBe(false);
  });

  it('does not let an unauthenticated/roleless caller view a draft they do not own', () => {
    expect(canAccessPage(draftPage, 'stranger', undefined)).toBe(false);
  });
});

describe('canCreateOrPublishWikiPage', () => {
  it('when the org setting is off, anyone can create/publish (the original, only, behavior)', () => {
    expect(canCreateOrPublishWikiPage(false, 'EMPLOYEE', true)).toBe(true);
    expect(canCreateOrPublishWikiPage(false, undefined, true)).toBe(true);
  });

  it('when the org setting is on, a non-moderator can still save a draft', () => {
    expect(canCreateOrPublishWikiPage(true, 'EMPLOYEE', false)).toBe(true);
  });

  it('when the org setting is on, a non-moderator cannot publish', () => {
    expect(canCreateOrPublishWikiPage(true, 'EMPLOYEE', true)).toBe(false);
  });

  it('when the org setting is on, a Manager or Admin can still publish', () => {
    expect(canCreateOrPublishWikiPage(true, 'MANAGER', true)).toBe(true);
    expect(canCreateOrPublishWikiPage(true, 'ADMIN', true)).toBe(true);
  });
});
