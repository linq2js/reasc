# REASC

React Async Component

## Installation

**with NPM**

```bash
npm i reasc --save
```

with YARN

```bash
yarn add reasc
```

## Getting Started

```jsx
import { reasc } from "reasc";
import { useState } from "react";
const UserInfo = reasc(
  { loading: () => <div>Loading...</div> },
  async ({ user }, { delay }) => {
    if (!user) return <div>No data</div>;
    await delay(300);
    const apiUrl = `https://api.github.com/users/${user}`;
    const data = await fetch(apiUrl).then((res) => res.json());
    return <pre>{JSON.stringify(data, null, 2)}</pre>;
  }
);
const App = () => {
  const [user, setUser] = useState("");
  const handleChange = (e) => setUser(e.target.value);
  return (
    <>
      <input onChange={handleChange} placeholder="Enter github username" />
      <UserInfo user={user} />
    </>
  );
};
```

## Examples

- [Github User Search App](https://codesandbox.io/s/reasc-demo-gituser-search-70l6i?file=/src/App.tsx)
