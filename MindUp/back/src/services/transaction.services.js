const { mongoose } = require("../config/database");

function isTransactionUnsupported(error) {
  const message = [
    error?.message,
    error?.errorResponse?.message,
    error?.originalError?.message,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    error?.code === 20 ||
    error?.originalError?.code === 20 ||
    /Transaction numbers are only allowed|does not support retryable writes|replica set|mongos/i.test(
      message,
    )
  );
}

/**
 * Executa o trabalho dentro de uma transação quando o MongoDB suporta
 * (Atlas ou replica set local). Em um mongod standalone, executa sem sessão
 * para não impedir o desenvolvimento local.
 */
async function withTransaction(work) {
  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      return work(null);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

module.exports = { withTransaction };
