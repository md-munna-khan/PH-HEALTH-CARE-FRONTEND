/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

export const loginUser = async (
  _currentState: any,
  formData: any
): Promise<any> => {
  try {
    const loginData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(loginData),
    }).then((res) => res.json());
    console.log(res);
    return res;
  } catch (error) {
    console.log(error);
    return { error: "login failed" };
  }
};
