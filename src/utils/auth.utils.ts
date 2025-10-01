// JWT utilities for validating NextAuth tokens on the backend
import jwt from "jsonwebtoken";

interface SessionUser {
    email: string;
    name?: string;
    image?: string;
    id?: string;
}

interface NextAuthJWT {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
    iat: number;
    exp: number;
    jti: string;
}

export const verifyNextAuthToken = (token: string): SessionUser | null => {
    try {
        // For development, we'll skip JWT verification
        // In production, you'd verify with NEXTAUTH_SECRET
        if (process.env.NODE_ENV === "development") {
            // Parse token without verification for development
            const decoded = jwt.decode(token) as NextAuthJWT;
            if (decoded && decoded.email) {
                return {
                    email: decoded.email,
                    name: decoded.name,
                    image: decoded.picture,
                    id: decoded.sub,
                };
            }
        } else {
            // In production, verify the token with NEXTAUTH_SECRET
            const secret = process.env.NEXTAUTH_SECRET;
            if (!secret) {
                throw new Error("NEXTAUTH_SECRET not configured");
            }

            const decoded = jwt.verify(token, secret) as NextAuthJWT;
            return {
                email: decoded.email,
                name: decoded.name,
                image: decoded.picture,
                id: decoded.sub,
            };
        }
    } catch (error) {
        console.error("Token verification failed:", error);
    }

    return null;
};

export const extractUserFromRequest = (req: any): SessionUser | null => {
    // Try to get user from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        return verifyNextAuthToken(token);
    }

    // Try to get user from custom header (for development)
    const userEmail = req.headers["x-user-email"];
    const userName = req.headers["x-user-name"];
    const userImage = req.headers["x-user-image"];
    const userId = req.headers["x-user-id"];

    if (userEmail) {
        return {
            email: userEmail as string,
            name: userName as string,
            image: userImage as string,
            id: userId as string,
        };
    }

    return null;
};
