/* Shared mock storage for the dealer's interest-vehicle status and management pages.
   Principal identities are fixed by role; query parameters never select another user's list. */
(function (root) {
  'use strict';

  function isDealer(role) {
    return role === 'dealer_owner' || role === 'dealer_staff';
  }

  function allowedPool(role, rows) {
    if (!isDealer(role)) return [];
    var policy = root.MIQCommon.roles.targetPolicy(role);
    return (Array.isArray(rows) ? rows : []).filter(function (vehicle) {
      return vehicle && typeof vehicle.vin === 'string' && vehicle.vin.length > 0 &&
        (!policy.companyIds || policy.companyIds.indexOf(vehicle.companyId) >= 0);
    });
  }

  function storageKey(role) {
    return 'linq.favorites.v1:central-dealer:' + (role === 'dealer_owner' ? 'owner-park' : 'staff-jung');
  }

  function validated(role, ids, rows) {
    var allowed = allowedPool(role, rows).map(function (vehicle) { return vehicle.vin; });
    return root.MIQMeeting.favoriteIds(ids, allowed);
  }

  function read(role, rows) {
    if (!isDealer(role)) return [];
    return validated(role, JSON.parse(root.localStorage.getItem(storageKey(role))), rows);
  }

  function save(role, ids, rows) {
    if (!isDealer(role)) throw new Error('딜러 전용 메뉴입니다.');
    var saved = validated(role, ids, rows);
    // A storage failure must reach the caller before it commits its draft as saved.
    root.localStorage.setItem(storageKey(role), JSON.stringify(saved));
    return saved;
  }

  root.MIQFavorites = { isDealer: isDealer, allowedPool: allowedPool, read: read, save: save };
}(typeof window !== 'undefined' ? window : globalThis));
