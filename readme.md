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
  // specified what will be rendered while rendering progress is executing
  { loading: () => "Loading..." },
  async (props, context) => {
    if (!props.user) return "No data";
    // delay rendering in 300ms
    // current rendering progress will be cancelled if there is new rendering requested
    await context.delay(300);
    const data = await fetch(`https://api.github.com/users/${props.user}`).then(
      (res) => res.json()
    );
    return <pre>{JSON.stringify(data, null, 2)}</pre>;
  }
);

const App = () => {
  const [user, setUser] = useState("");
  const changeChange = (e) => setUser(e.target.value);

  return (
    <>
      <input onChange={handleChange} />
      <div>
        <UserInfo user={user} />
      </div>
    </>
  );
};
```
