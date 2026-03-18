import prisma from "../../config/prisma.js";

const BorrowerModel = {
  async create(data) {
    return prisma.user.create({
      data: {
        ...data,
        role: "BORROWER",
      },
    });
  },

  async findByEmail(email) {
    return prisma.user.findFirst({
      where: {
        email,
        role: "BORROWER",
      },
    });
  },

  async findById(id) {
    return prisma.user.findFirst({
      where: {
        id,
        role: "BORROWER",
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

export default BorrowerModel;