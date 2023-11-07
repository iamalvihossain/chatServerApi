const graphql = require("graphql");
const Property = require("../models/property");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { Api } = require("zerobounce");
const bcrypt = require("bcrypt");
const postmark = require("postmark");
const B2 = require("backblaze-b2");
const NewsletterSubscription = require("../models/newsletterSubscription");

const client = new postmark.ServerClient(
  "9db61238-471c-4c85-9e48-c41e9e87f85e"
);

const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLSchema,
  GraphQLList,
  GraphQLNonNull,
  GraphQLEnumType,
  GraphQLID,
  GraphQLBoolean,
  GraphQLScalarType,
  GraphQLInputObjectType,
} = graphql;

const DateType = new GraphQLScalarType({
  name: "Date",
  description: "A custom scalar type for dates",
  serialize(value) {
    return value.toISOString();
  },
  parseValue(value) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

const zb = new Api("c7f4c450ab824405b12af12c6e4d3256");

const AuthResponseType = new GraphQLObjectType({
  name: "AuthResponse",
  fields: () => ({
    token: { type: GraphQLString },
    userId: { type: GraphQLID },
  }),
});

const propertyListingEnumType = new GraphQLEnumType({
  name: "propertyListingType",
  values: {
    RENT: { value: "rent" },
    BUY: { value: "buy" },
  },
});

const AmenityInputType = new GraphQLObjectType({
  name: "AmenityInput",
  fields: () => ({
    name: { type: GraphQLString },
    icon: { type: GraphQLString },
  }),
});

const userRoleEnumType = new GraphQLEnumType({
  name: "userRole",
  values: {
    agent: { value: "agent" },
    regular: { value: "regular" },
  },
});

const genderEnumType = new GraphQLEnumType({
  name: "gender",
  values: {
    Male: { value: "Male" },
    Female: { value: "Female" },
  },
});

const detailedAddressInputType = new GraphQLInputObjectType({
  name: "DetailedAddressInput",
  fields: () => ({
    street: { type: GraphQLString },
    city: { type: GraphQLString },
    state: { type: GraphQLString },
  }),
});

const propertyAttributesInputType = new GraphQLInputObjectType({
  name: "PropertyAttributesInput",
  fields: () => ({
    numberOfBedrooms: { type: GraphQLInt },
    numberOfGarages: { type: GraphQLInt },
    yearBuilt: { type: GraphQLString },
    size: { type: GraphQLString },
    numberOfBathrooms: { type: GraphQLInt },
    propertyType: { type: GraphQLString },
  }),
});

const floorPlanInputType = new GraphQLInputObjectType({
  name: "FloorPlanInput",
  fields: () => ({
    numberOfFloors: { type: GraphQLInt },
    size: { type: GraphQLString },
    roomSize: { type: GraphQLString },
    bathroomSize: { type: GraphQLString },
  }),
});

const detailedAddressType = new GraphQLObjectType({
  name: "detailedAddress",
  fields: () => ({
    street: { type: GraphQLString },
    city: { type: GraphQLString },
    state: { type: GraphQLString },
  }),
});

const propertyAttributesType = new GraphQLObjectType({
  name: "PropertyDetails",
  fields: () => ({
    numberOfBedrooms: {
      type: GraphQLInt,
    },

    numberOfGarages: {
      type: GraphQLInt,
    },
    yearBuilt: {
      type: GraphQLString,
    },
    size: {
      type: GraphQLString,
    },
    numberOfBathrooms: {
      type: GraphQLInt,
    },
    propertyType: {
      type: GraphQLString,
    },
  }),
});

const floorPlanType = new GraphQLObjectType({
  name: "floorPlan",
  fields: () => ({
    numberOfFloors: {
      type: GraphQLInt,
    },
    size: {
      type: GraphQLString,
    },
    roomSize: {
      type: GraphQLString,
    },
    bathroomSize: {
      type: GraphQLString,
    },
  }),
});

const propertyType = new GraphQLObjectType({
  name: "Property",
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLString) },
    listingType: { type: GraphQLNonNull(propertyListingEnumType) },
    priceForRent: { type: GraphQLInt },
    priceForBuy: { type: GraphQLInt },
    propertyImageList: { type: GraphQLList(GraphQLString) },
    address: { type: GraphQLString },
    title: { type: GraphQLNonNull(GraphQLString) },
    amenities: {
      type: GraphQLList(AmenityInputType),
    },
    favourite: { type: GraphQLBoolean },
    detailedAddress: { type: detailedAddressType },
    propertyAttributes: { type: propertyAttributesType },
    floorPlan: { type: floorPlanType },
    description: { type: GraphQLString },
    createdAt: { type: DateType },
    user: {
      type: userType,
      resolve: async (parent, args) => {
        const user = await User.findById(parent.user);
        return user;
      },
    },
    userProperties: {
      type: new GraphQLList(propertyType),
      resolve: async (parent, args) => {
        const properties = await Property.find({ user: parent.user });
        return properties;
      },
    },
  }),
});

const userType = new GraphQLObjectType({
  name: "User",
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    email: { type: GraphQLNonNull(GraphQLString) },
    role: { type: userRoleEnumType },
    gender: { type: genderEnumType },
    dateOfBirth: { type: GraphQLString },
    address: { type: GraphQLString },
    about: { type: GraphQLString },
    phoneNumber: { type: GraphQLString },
    createdAt: { type: DateType },
    profilePictureUrl: { type: GraphQLString },
    website: { type: GraphQLString },
    properties: {
      type: new GraphQLList(propertyType),
      resolve: async (parent, args) => {
        const properties = await Property.find({ user: parent.id });
        return properties;
      },
    },
    wishlist: {
      type: new GraphQLList(propertyType),
      resolve: async (parent, args) => {
        const user = await User.findById(parent.id).populate("wishlist");
        return user.wishlist;
      },
    },
  }),
});

const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  fields: () => ({
    allProperties: {
      type: GraphQLList(propertyType),
      resolve: async (parent, args, context) => {
        return await Property.find({});
      },
    },
    properties: {
      type: GraphQLList(propertyType),
      args: {
        listingType: { type: GraphQLNonNull(propertyListingEnumType) },
      },
      resolve: async (parent, { listingType }) => {
        return await Property.find({ listingType: listingType });
      },
    },
    property: {
      type: propertyType,
      args: {
        id: { type: GraphQLNonNull(GraphQLString) },
      },
      resolve: async (parent, { id }) => {
        const property = await Property.findById(id);
        if (!property) {
          throw new Error(`Property with ID ${id} not found.`);
        }
        return property;
      },
    },
    propertiesByUser: {
      type: GraphQLList(propertyType),
      args: {
        userId: { type: GraphQLNonNull(GraphQLString) },
      },
      resolve: async (parent, { userId }, context) => {
        console.log({ context });
        return await Property.find({ user: userId });
      },
    },
    users: {
      type: GraphQLList(userType),
      resolve: async () => {
        return await User.find({});
      },
    },
    user: {
      type: userType,
      args: {
        id: { type: GraphQLNonNull(GraphQLString) },
      },
      resolve: async (parent, { id }) => {
        const user = await User.findById(id);
        if (!user) throw new Error("User not found.");
        return user;
      },
    },
  }),
});

const mutation = new GraphQLObjectType({
  name: "MutationType",
  fields: () => ({
    createListing: {
      type: propertyType,
      args: {
        userId: { type: GraphQLNonNull(GraphQLID) },
        listingType: { type: GraphQLNonNull(propertyListingEnumType) },
        priceForRent: { type: GraphQLInt },
        priceForBuy: { type: GraphQLInt },
        address: { type: GraphQLString },
        title: { type: GraphQLNonNull(GraphQLString) },
        favourite: { type: GraphQLBoolean },
        street: { type: GraphQLString },
        city: { type: GraphQLString },
        state: { type: GraphQLString },
        amenities: {
          type: new GraphQLList(
            new GraphQLInputObjectType({
              name: "AmenitiesInput",
              fields: {
                name: { type: GraphQLString },
                icon: { type: GraphQLString },
              },
            })
          ),
        },
        propertyImageList: { type: new GraphQLList(GraphQLString) },
        numberOfBedrooms: {
          type: GraphQLInt,
        },
        numberOfGarages: {
          type: GraphQLInt,
        },
        yearBuilt: {
          type: GraphQLString,
        },
        size: {
          type: GraphQLString,
        },
        numberOfBathrooms: {
          type: GraphQLInt,
        },
        propertyType: {
          type: GraphQLNonNull(GraphQLString),
        },
        numberOfFloors: {
          type: GraphQLInt,
        },

        roomSize: {
          type: GraphQLString,
        },
        bathroomSize: {
          type: GraphQLString,
        },
        description: { type: GraphQLString },
      },
      resolve: async (parent, args, context) => {
        const property = new Property({
          user: args.userId,
          listingType: args.listingType,
          priceForRent: args.priceForRent,
          priceForBuy: args.priceForBuy,
          address: args.address,
          title: args.title,
          amenities: args.amenities,
          favourite: args.favourite,

          propertyImageList: args.propertyImageList,
          detailedAddress: {
            street: args.street,
            city: args.city,
            state: args.state,
          },
          propertyAttributes: {
            propertyType: args.propertyType,
            numberOfGarages: args.numberOfGarages,
            numberOfBedrooms: args.numberOfBedrooms,
            numberOfBathrooms: args.numberOfBathrooms,
            size: args.size,
            yearBuilt: args.yearBuilt,
          },
          floorPlan: {
            roomSize: args.roomSize,
            bathroomSize: args.bathroomSize,
            numberOfFloors: args.numberOfFloors,
          },
          description: args.description,
        });
        const createdProperty = await property.save();

        await User.findByIdAndUpdate(args.userId, {
          $push: { properties: createdProperty._id },
        });

        return createdProperty;
      },
    },

    updateProperty: {
      type: propertyType,
      args: {
        id: { type: GraphQLNonNull(GraphQLID) },
        listingType: { type: propertyListingEnumType },
        priceForRent: { type: GraphQLInt },
        priceForBuy: { type: GraphQLInt },
        address: { type: GraphQLString },
        title: { type: GraphQLString },
        favourite: { type: GraphQLBoolean },

        amenities: {
          type: new GraphQLList(
            new GraphQLInputObjectType({
              name: "AmenitiesInputUpdate",
              fields: {
                name: { type: GraphQLString },
                icon: { type: GraphQLString },
              },
            })
          ),
        },
        detailedAddress: {
          type: detailedAddressInputType,
        },
        propertyAttributes: {
          type: propertyAttributesInputType,
        },
        floorPlan: {
          type: floorPlanInputType,
        },
        propertyImageList: { type: new GraphQLList(GraphQLString) },

        description: { type: GraphQLString },
      },
      resolve: async (parent, { id, ...args }, context) => {
        let property = await Property.findById(id);

        if (!property) {
          throw new Error(`Property with ID ${id} not found.`);
        }

        if (args.propertyAttributes) {
          property.propertyAttributes = {
            ...property.propertyAttributes,
            ...args.propertyAttributes,
          };
        }

        if (args.detailedAddress) {
          property.detailedAddress = {
            ...property.detailedAddress,
            ...args.detailedAddress,
          };
        }

        if (args.floorPlan) {
          property.floorPlan = {
            ...property.floorPlan,
            ...args.floorPlan,
          };
        }

        // Update other direct fields
        for (let prop in args) {
          if (
            prop !== "propertyAttributes" &&
            prop !== "detailedAddress" &&
            prop !== "floorPlan"
          ) {
            if (args[prop] !== undefined) {
              property[prop] = args[prop];
            }
          }
        }

        return await property.save();
      },
    },

    addToWishlist: {
      type: userType,
      args: {
        userId: { type: GraphQLNonNull(GraphQLString) },
        propertyId: { type: GraphQLNonNull(GraphQLString) },
      },
      resolve: async (parent, { userId, propertyId }) => {
        try {
          const user = await User.findById(userId);
          if (!user) {
            throw new Error("User not found.");
          }

          const isAlreadyInWishlist = user.wishlist.includes(propertyId);

          if (!isAlreadyInWishlist) {
            user.wishlist.push(propertyId);
          }

          const property = await Property.findById(propertyId);
          if (property) {
            // property.favourite = true;
            await property.save();
          }

          await user.save();
          return user;
        } catch (error) {
          throw new Error(error.message);
        }
      },
    },

    removeFromWishList: {
      type: userType,
      args: {
        userId: { type: GraphQLNonNull(GraphQLString) },
        propertyId: { type: GraphQLNonNull(GraphQLString) },
      },
      resolve: async (parent, { userId, propertyId }, context) => {
        try {
          const user = await User.findById(userId);
          if (!user) {
            throw new Error(`User with ID ${userId} not found.`);
          }

          const propertyIndex = user.wishlist.indexOf(propertyId);
          if (propertyIndex === -1) {
            throw new Error(
              `Property with ID ${propertyId} not found in user's wish list.`
            );
          }

          user.wishlist.splice(propertyIndex, 1);

          const property = await Property.findById(propertyId);
          if (property) {
            // property.favourite = false;
            await property.save();
          }

          await user.save();
          return user;
        } catch (error) {
          throw new Error(error.message);
        }
      },
    },

    registerUser: {
      type: userType,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (parent, args) => {
        const { email, password, name } = args;

        const userExists = await User.findOne({ email });
        if (userExists) throw new Error("Email already registered.");

        const token = jwt.sign({ email }, process.env.JWT_SECRET, {
          expiresIn: "1h",
        });

        const user = new User({
          email,
          password,
          name,
        });
        await user.save();

        const baseUrl =
          process.env.NODE_ENV === "production"
            ? process.env.PROD_URL
            : process.env.DEV_URL;
        const verifyEmailLink = `${baseUrl}/verify-email?token=${token}&email=${email}`;

        const mail = {
          From: "admin@aspiantech.co.uk",
          To: email,
          Subject: "Email Verification",
          HtmlBody: `
    <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
      <h2 style="color: #4338ca;">Email Verification</h2>
      <p style="font-size: 16px;">Thank you for registering!</p>
      <p style="font-size: 16px;">Please click on the following link to verify your email:</p>
      <a href="${verifyEmailLink}" style="display: inline-block; background-color: #4338ca; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 16px; margin-top: 20px;">Verify Email</a>
      <p style="font-size: 14px;">Best regards,</p>
      <p style="font-size: 14px;">Ogle</p>
    </div>
  `,
        };

        try {
          const result = await client.sendEmail(mail);
          console.log(result);
        } catch (error) {
          console.error(error);
        }

        return user;
      },
    },

    verifyEmail: {
      type: GraphQLString,
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
        token: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (parent, args) => {
        const { email, token } = args;

        try {
          const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
          if (decodedToken.email !== email) {
            throw new Error("Invalid token");
          }

          const user = await User.findOneAndUpdate(
            { email },
            { verified: true },
            { new: true }
          );

          if (!user) {
            throw new Error("User not found");
          }

          return "Email verification successful";
        } catch (error) {
          console.error("Error verifying email:", error);
          throw new Error("An error occurred while verifying email");
        }
      },
    },

    loginUser: {
      type: GraphQLString,
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (parent, args, context) => {
        const { email, password } = args;
        const user = await User.findOne({ email });
        if (!user) {
          throw new Error("Incorect email address or password");
        }

        if (user.verified === false) {
          throw new Error("Email address not verified");
        }

        const isPasswordCorrect = await user.comparePassword(password);
        if (!isPasswordCorrect) {
          throw new Error("Invalid email or password");
        }

        const token = jwt.sign(
          { id: user._id, email: user.email },
          "mysecretkey",
          { expiresIn: "1d" }
        );

        return token;
      },
    },

    subscribeToNewsletter: {
      type: GraphQLString,
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (parent, args) => {
        const { email } = args;
        const existingSubscription = await NewsletterSubscription.findOne({
          email,
        });
        if (existingSubscription) {
          return "You are already subscribed to our newsletter.";
        }

        await NewsletterSubscription.create({ email });

        const confirmationMessage = `
        Thank you for joining our newsletter! We’ll be in touch with some tips and premium content, watch this space!
      `;

        const mail = {
          From: "admin@aspiantech.co.uk",
          To: email,
          Subject: "Newsletter Subscription Confirmation",
          HtmlBody: `
          <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
            <h2 style="color: #4338ca;">Newsletter Subscription Confirmation</h2>
            <p style="font-size: 16px;">${confirmationMessage}</p>
            <p style="font-size: 14px; margin-top: 20px;">Best regards,</p>
            <p style="font-size: 14px;">Ogle</p>
          </div>
        `,
        };

        try {
          const result = await client.sendEmail(mail);
          console.log(result);
        } catch (error) {
          console.error(error);
          throw new Error("Failed to send password reset email");
        }

        return "A confirmation email has been sent.";
      },
    },
    requestPasswordReset: {
      type: GraphQLString,
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (parent, args) => {
        const { email } = args;

        const user = await User.findOne({ email });
        if (!user) {
          throw new Error("User not found");
        }

        const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, {
          expiresIn: "1h",
        });

        const baseUrl =
          process.env.NODE_ENV === "production"
            ? process.env.PROD_URL
            : process.env.DEV_URL;
        const resetLink = `${baseUrl}/password-reset?token=${resetToken}&email=${email}`;

        const mail = {
          From: "admin@aspiantech.co.uk",
          To: email,
          Subject: "Password Reset",
          HtmlBody: `
    <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; ">
      <h2 style="color: #4338ca;">Password Reset</h2>
      <p style="font-size: 16px;">Dear User,</p>
      <p style="font-size: 16px;">We have received a request to reset your password. Please click on the following link to reset your password:</p>
      <a href="${resetLink}" style="display: inline-block; background-color: #4338ca; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 16px; margin-top: 20px;">Reset Password</a>
      <p style="font-size: 14px; margin-top: 20px;">Best regards,</p>
      <p style="font-size: 14px;">Ogle</p>
    </div>
  `,
        };

        try {
          const result = await client.sendEmail(mail);
          console.log(result);
        } catch (error) {
          console.error(error);
          throw new Error("Failed to send password reset email");
        }

        return "Password reset email sent";
      },
    },

    resetPassword: {
      type: GraphQLString,
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
        confirmPassword: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (parent, args) => {
        const { email, password, confirmPassword } = args;

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const updatedUser = await User.findOneAndUpdate(
          { email },
          { password: hash },
          { new: true }
        );

        if (!updatedUser) {
          throw new Error("User not found");
        }

        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }

        return "Password reset successfully";
      },
    },

    updateUser: {
      type: userType,
      args: {
        id: { type: GraphQLNonNull(GraphQLString) },
        name: { type: GraphQLString },
        email: { type: GraphQLString },
        role: { type: userRoleEnumType },
        gender: { type: genderEnumType },
        dateOfBirth: { type: GraphQLString },
        address: { type: GraphQLString },
        about: { type: GraphQLString },
        phoneNumber: { type: GraphQLString },
        profilePictureUrl: { type: GraphQLString },
        website: { type: GraphQLString },
      },
      resolve: async (parent, { id, ...args }, context) => {
        let user = await User.findById(id);

        if (!user) {
          throw new Error(`Property with ID ${id} not found.`);
        }

        for (let prop in args) {
          if (args[prop] !== undefined) {
            user[prop] = args[prop];
          }
        }

        return await user.save();
      },
    },

    logoutUser: {
      type: GraphQLString,
      resolve: (parent, args, context) => {
        return "Logout success";
      },
    },

    deleteUserAccount: {
      type: GraphQLString,
      args: {
        userId: { type: GraphQLNonNull(GraphQLID) },
      },
      resolve: async (parent, { userId }) => {
        try {
          const user = await User.findById(userId);
          if (!user) {
            throw new Error(`User with ID ${userId} not found.`);
          }

          const propertyIds = user.properties;

          await Property.deleteMany({ _id: { $in: propertyIds } });

          await User.findByIdAndDelete(userId);

          // Sending confirmation email
          const mail = {
            From: "admin@aspiantech.co.uk",
            To: user.email,
            Subject: "Account Deletion Confirmation",
            HtmlBody: `
          <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; ">
            <h2 style="color: #4338ca;">Account Deletion Confirmation</h2>
            <p style="font-size: 16px;">Dear User,</p>
            <p style="font-size: 16px;">Your account has been successfully deleted.</p>
            <p style="font-size: 14px; margin-top: 20px;">Best regards,</p>
            <p style="font-size: 14px;">Ogle</p>
          </div>
        `,
          };

          try {
            const result = await client.sendEmail(mail);
            console.log(result);
          } catch (error) {
            console.error(error);
            throw new Error("Failed to send deletion confirmation email ");
          }

          return "User account and associated properties have been successfully deleted.";
        } catch (error) {
          throw new Error(error.message);
        }
      },
    },

    deletePropertyImage: {
      type: propertyType,
      args: {
        id: { type: GraphQLNonNull(GraphQLString) },
        imageIndex: { type: GraphQLNonNull(GraphQLInt) },
      },
      resolve: async (parent, { id, imageIndex }, context) => {
        let property = await Property.findById(id);

        if (!property) {
          throw new Error(`Property with ID ${id} not found.`);
        }

        if (imageIndex < 0 || imageIndex >= property.propertyImageList.length) {
          throw new Error("Invalid image index.");
        }

        // Remove the image at the specified index
        property.propertyImageList.splice(imageIndex, 1);

        return await property.save();
      },
    },

    deleteProperty: {
      type: userType,
      args: {
        propertyId: { type: GraphQLNonNull(GraphQLString) },
        userId: { type: GraphQLNonNull(GraphQLString) },
      },
      resolve: async (parent, { propertyId, userId }) => {
        try {
          const property = await Property.findById(propertyId);
          if (!property) {
            throw new Error("Property not found.");
          }

          if (property.user.toString() !== userId) {
            throw new Error("You are not authorized to delete this property.");
          }

          await Property.findByIdAndDelete(propertyId);

          const user = await User.findById(userId);
          if (!user) {
            throw new Error("User not found.");
          }

          user.properties = user.properties.filter(
            (propId) => propId.toString() !== propertyId
          );
          await user.save();

          return user; // Return the updated user object
        } catch (error) {
          throw new Error(error.message);
        }
      },
    },
  }),
});

module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation,
});
