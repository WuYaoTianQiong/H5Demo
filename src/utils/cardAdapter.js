/**
 * 卡片数据适配器（精简版）
 * 用于 TripCard 与 API 数据格式之间的转换
 */
import { TripCard, CardOption, CARD_TYPES, CARD_STATES } from '@/types/card.js';

/**
 * 将API返回的事件数据转换为TripCard
 * @param {Object} apiEvent - API返回的事件数据
 * @param {string} dayId - 日程ID
 * @returns {TripCard}
 */
export function apiEventToTripCard(apiEvent, dayId = '') {
  if (!apiEvent) return null;
  return TripCard.fromApiResponse(apiEvent, dayId);
}

/**
 * 将TripCard转换为API提交格式
 * @param {TripCard} card
 * @returns {Object}
 */
export function tripCardToApiPayload(card) {
  if (!card) return null;
  return card.toApiPayload();
}

/**
 * 保存卡片前的数据准备
 * @param {TripCard} card
 * @param {string} tripId
 * @param {number} order - 卡片顺序
 * @returns {Object}
 */
export function prepareCardForSave(card, tripId, order = 0) {
  if (!card) return null;
  const payload = card.toApiPayload();
  return {
    tripId,
    order,
    ...payload
  };
}

/**
 * 多选卡片拆分工具
 * @param {TripCard} multiCard
 * @returns {TripCard[]}
 */
export function splitMultiCard(multiCard) {
  if (!multiCard || !multiCard.isMultiSelect) {
    return [multiCard];
  }
  return multiCard.splitToSingleCards();
}

/**
 * 合并多个单选卡片为多选卡片
 * @param {TripCard[]} cards
 * @param {string} name - 多选卡片名称
 * @returns {TripCard}
 */
export function mergeCardsToMulti(cards, name = '合并卡片') {
  if (!Array.isArray(cards) || cards.length === 0) {
    return null;
  }
  if (cards.length === 1) {
    return cards[0];
  }

  const firstCard = cards[0];
  const multiCard = new TripCard({
    dayId: firstCard.dayId,
    cardType: CARD_TYPES.MULTI,
    title: name
  });

  cards.forEach((card, index) => {
    multiCard.addOption({
      name: card.title || `选项${index + 1}`,
      title: card.title,
      type: card.type,
      time: card.time,
      duration: card.duration,
      state: card.state,
      tags: [...card.tags],
      description: card.description,
      detail: card.detail,
      locationId: card.locationId,
      locationInfo: card.locationInfo
    });
  });

  return multiCard;
}

/**
 * 验证卡片数据
 * @param {TripCard} card
 * @returns {Object} - {valid: boolean, errors: string[]}
 */
export function validateCard(card) {
  const errors = [];

  if (!card) {
    return { valid: false, errors: ['卡片数据为空'] };
  }

  if (card.isSingleSelect) {
    if (!card.title || !uni.$u.trim(card.title)) {
      errors.push('请输入卡片标题');
    }
  } else {
    if (!card.options || card.options.length === 0) {
      errors.push('请至少添加一个选项');
    } else {
      const firstOpt = card.options[0];
      if (!uni.$u.trim(firstOpt.title) && !uni.$u.trim(firstOpt.name)) {
        errors.push('请输入第一个选项的标题');
      }
    }
  }

  if (card.isMultiSelect && card.options) {
    card.options.forEach((opt, index) => {
      if (opt.time && !/^\d{2}:\d{2}$/.test(opt.time)) {
        errors.push(`选项${index + 1}的时间格式不正确`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 创建默认卡片
 * @param {string} type - 'single' | 'multi'
 * @param {string} dayId
 * @returns {TripCard}
 */
export function createDefaultCard(type = CARD_TYPES.SINGLE, dayId = '') {
  if (type === CARD_TYPES.MULTI) {
    return new TripCard({
      dayId,
      cardType: CARD_TYPES.MULTI,
      options: [
        new CardOption({
          name: '选项1',
          type: CARD_TYPES.SPOT,
          state: CARD_STATES.ACTIVE
        })
      ]
    });
  }

  return new TripCard({
    dayId,
    cardType: CARD_TYPES.SINGLE,
    type: CARD_TYPES.SPOT,
    state: CARD_STATES.ACTIVE
  });
}

export default {
  apiEventToTripCard,
  tripCardToApiPayload,
  prepareCardForSave,
  splitMultiCard,
  mergeCardsToMulti,
  validateCard,
  createDefaultCard
};
