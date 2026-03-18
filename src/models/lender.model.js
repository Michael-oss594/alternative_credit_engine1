import prisma from "../../config/prisma.js";

const LenderModel = {
  async create(data) {
    return prisma.user.create({
      data: {
        ...data,
        role: "LENDER",
      },
    });
  },

  async findByEmail(email) {
    return prisma.user.findFirst({
      where: {
        email,
        role: "LENDER",
      },
    });
  },

  async findById(id) {
    return prisma.user.findFirst({
      where: {
        id,
        role: "LENDER",
      },
    });
  },

  async update(id, data) {
    return prisma.user.update({
      where: { id },
      data,
    });
  },

  async delete(id) {
    return prisma.user.delete({
      where: { id },
    });
  },
};

export default LenderModel;