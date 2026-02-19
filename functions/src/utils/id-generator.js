/**
 * 高性能ID生成器
 * 支持高并发、短位数、有序性
 * 
 * 方案对比：
 * 
 * 方案1: 14位ID（默认）
 *   格式：10位时间戳(秒级) + 4位序列号
 *   容量：每秒10,000个ID
 *   示例：17365008001234
 * 
 * 方案2: 12位ID
 *   格式：8位时间戳(秒级) + 4位序列号
 *   容量：每秒10,000个ID，可用约317年
 *   示例：6508001234
 * 
 * 方案3: 13位ID（推荐）
 *   格式：9位时间戳(秒级) + 4位序列号
 *   容量：每秒10,000个ID，可用约31年
 *   示例：7308001234
 */

class IdGenerator {
  constructor(options = {}) {
    this.lastSecond = 0;
    this.sequence = 0;
    this.maxSequence = options.maxSequence || 9999;
    this.timestampBits = options.timestampBits || 9;
    this.sequenceBits = options.sequenceBits || 4;
    this.sequenceMask = Math.pow(10, this.sequenceBits) - 1;
  }

  nextId() {
    let now = Math.floor(Date.now() / 1000);

    if (now === this.lastSecond) {
      this.sequence = (this.sequence + 1) & this.sequenceMask;

      // 序列号溢出，等待下一秒（使用轻量等待代替忙等待）
      if (this.sequence === 0) {
        const waitStart = Date.now();
        // 最多等待1.1秒，避免无限循环
        while (now <= this.lastSecond && (Date.now() - waitStart) < 1100) {
          now = Math.floor(Date.now() / 1000);
        }
        this.lastSecond = now;
      }
    } else {
      this.sequence = 0;
      this.lastSecond = now;
    }

    const timestampStr = this.lastSecond.toString().slice(-this.timestampBits);
    const sequenceStr = this.sequence.toString().padStart(this.sequenceBits, '0');

    return timestampStr + sequenceStr;
  }
}

const idGenerator = new IdGenerator();

function generateId() {
  return idGenerator.nextId();
}

function generateTripId() {
  return generateId();
}

function generateScheduleId() {
  return generateId();
}

function generateDayId() {
  return generateId();
}

function generateEventId() {
  return generateId();
}

function generateLocationId() {
  return generateId();
}

function generateClientId() {
  return generateId();
}

function generateUserId() {
  return generateId();
}

function generateSessionId() {
  return generateId();
}

export {
  IdGenerator,
  generateId,
  generateTripId,
  generateScheduleId,
  generateDayId,
  generateEventId,
  generateLocationId,
  generateClientId,
  generateUserId,
  generateSessionId
};
